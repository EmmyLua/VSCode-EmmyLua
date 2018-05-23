import { ByteArray } from "./ByteArray";

export enum DebugMessageId {
    ReqInitialize,
    RespInitialize,

    Continue,
    StepOver,
    StepInto,
    StepOut,
    AddBreakpoint,
    DelBreakpoint,
    Break,
    Detach,
    PatchReplaceLine,
    PatchInsertLine,
    PatchDeleteLine,
    LoadDone,
    IgnoreException,
    DeleteAllBreakpoints,

    CreateVM,
    NameVM,
    DestroyVM,
    LoadScript,
    SetBreakpoint,
    Exception,
    LoadError,
    Message,
    SessionEnd,

    ReqEvaluate,
    RespEvaluate,

    ReqProfilerBegin,
    RespProfilerBegin,
    ReqProfilerEnd,
    RespProfilerEnd,
    RespProfilerData,

    ReqReloadScript,
    RespReloadScript,

    ReqStdin,
}

export enum CodeState {
    Normal            ,    // The code is normal.
    Unavailable       ,    // The code for the script was not available.
    Binary            ,    // The code was loaded as a binary/compiled file
}

export class LuaAttachMessage {
    id: DebugMessageId;
    L: number = 0;

    constructor(id: DebugMessageId) {
        this.id = id;
    }

    public write(buf: ByteArray) {
        buf.writeUint32(this.id);
        buf.writeUint64(this.L);
    }

    public read(buf: ByteArray) {
        this.L = buf.readUint64();
    }
}

export class DMReqInitialize extends LuaAttachMessage {
    symbolsDirectory: string;
    emmyLuaFile: string;
    captureStd:boolean;
    captureOutputDebugString:boolean;
    
    constructor(symbolsDirectory:string,
        emmyLuaFile: string,
        captureStd:boolean,
        captureOutputDebugString:boolean = false) {
        super(DebugMessageId.ReqInitialize);
        this.symbolsDirectory = symbolsDirectory;
        this.emmyLuaFile = emmyLuaFile;
        this.captureStd = captureStd;
        this.captureOutputDebugString = captureOutputDebugString;
    }

    public write(buf: ByteArray) {
        super.write(buf);
        buf.writeString(this.symbolsDirectory);
        buf.writeString(this.emmyLuaFile);
        buf.writeBoolean(this.captureStd);
        buf.writeBoolean(this.captureOutputDebugString);
    }
}

export class DMAddBreakpoint extends LuaAttachMessage {
    scriptIndex: number;
    line: number;
    expr: string;

    constructor(index:number, line: number, expr?: string) {
        super(DebugMessageId.AddBreakpoint);
        this.scriptIndex = index;
        this.line = line;
        this.expr = expr || "";
    }

    write(buf: ByteArray) {
        super.write(buf);
        buf.writeUint32(this.scriptIndex);
        buf.writeUint32(this.line);
        buf.writeString(this.expr);
    }
}

export class DMLoadScript extends LuaAttachMessage {
    fileName?:string;
    source?:string;
    index:number = 0;
    state:CodeState = CodeState.Normal;

    constructor() {
        super(DebugMessageId.LoadScript);
    }

    read(buf: ByteArray) {
        super.read(buf);
        this.fileName = buf.readString();
        this.source = buf.readString();
        this.index = buf.readUint32();
        this.state = buf.readByte() as CodeState;
    }
}

export class DMMessage extends LuaAttachMessage {

    type: number = 0;
    text?:string;

    constructor () {
        super(DebugMessageId.Message);
    }

    read(buf: ByteArray) {
        super.read(buf);
        this.type = buf.readUint32();
        this.text = buf.readString();
    }
}

export class DMBreak extends LuaAttachMessage {

    public stacks?: StackNodeContainer;

    constructor() {
        super(DebugMessageId.Break);
    }

    read(buf: ByteArray) {
        super.read(buf);
        this.stacks = <StackNodeContainer> readNode({}, buf);
    }
}

export enum StackNodeId {
    List,
    Eval,
    StackRoot,

    Table,
    Function,
    UserData,
    String,
    Binary,
    Primitive,

    Error,
}

interface Context {

}

interface IStackNode {
    read(ctx: Context, buf: ByteArray): void;
}

class StackNode implements IStackNode {
    read(ctx: Context, buf: ByteArray) {

    }
}

export class StackNodeContainer extends StackNode {

    public children = new Array<IStackNode>();

    read(ctx: Context, buf: ByteArray) {
        const size = buf.readSize();
        for (var i = 0; i < size; i++) {
            const child = readNode(ctx, buf);
            this.children.push(child);
        }
    }
}

export class StackRootNode extends StackNodeContainer {

    public scriptIndex = 0;
    public line = 0;
    public functionName = "";

    read(ctx: Context, buf: ByteArray) {
        super.read(ctx, buf);
        this.scriptIndex = buf.readUint32();
        this.line = buf.readUint32();
        this.functionName = buf.readString();
    }
}

class LuaXObjectValue extends StackNode {

    public name = "";
    public type = "";
    public data = "";

    read(ctx: Context, buf: ByteArray) {
        this.name = buf.readString();
        this.type = buf.readString();
        this.data = buf.readString();
    }

    toKeyString() {
        return this.name;
    }
}

class LuaXTable extends LuaXObjectValue {

    public children = new Array<IStackNode>();

    read(ctx: Context, buf: ByteArray) {
        super.read(ctx, buf);
        const deep = buf.readBoolean();
        if (deep) {
            const size = buf.readSize();
            for (var i = 0; i < size; i++) {
                const key = <LuaXObjectValue> readNode(ctx, buf);
                const value = <LuaXObjectValue> readNode(ctx, buf);
                value.name = key.toKeyString();
                this.children.push(value);
            }
        }
    }
}

class LuaXString extends LuaXObjectValue {
    toKeyString() {
        return this.data;
    }
}

class LuaXPrimitive extends LuaXObjectValue {
    toKeyString() {
        return this.data;
    }
}

class LuaXFunction extends LuaXObjectValue {

    public script = 0;
    public line = 0;

    read(ctx: Context, buf:ByteArray) {
        super.read(ctx, buf);
        this.script = buf.readUint32();
        this.line = buf.readUint32();
    }
}

class LuaXUserdata extends LuaXObjectValue {

}

export function readNode(ctx: Context, buf: ByteArray): IStackNode {
    const id = <StackNodeId> buf.readByte();
    var node: IStackNode | undefined;
    switch (id) {
        case StackNodeId.List: node = new StackNodeContainer(); break;
        case StackNodeId.StackRoot: node = new StackRootNode(); break;
        case StackNodeId.Table: node = new LuaXTable(); break;

        case StackNodeId.Function: node = new LuaXFunction(); break;
        case StackNodeId.UserData: node = new LuaXUserdata(); break;
        
        case StackNodeId.String: node = new LuaXString(); break;
        case StackNodeId.Primitive: node = new LuaXPrimitive(); break;
    }
    const n = <IStackNode> node;
    n.read(ctx, buf);
    return n;
}