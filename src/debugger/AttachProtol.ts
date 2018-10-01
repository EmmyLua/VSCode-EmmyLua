import { ByteArray } from "./ByteArray";
import { Variable, Handles } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";

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

export class DMDelBreakpoint extends LuaAttachMessage {
    scriptIndex: number;
    line: number;

    constructor(si: number, l: number) {
        super(DebugMessageId.DelBreakpoint);
        this.scriptIndex = si;
        this.line = l;
    }

    write(buf: ByteArray) {
        super.write(buf);
        buf.writeUint32(this.scriptIndex);
        buf.writeUint32(this.line);
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

export class DMReqEvaluate extends LuaAttachMessage {
    public evalId: number = 0;
    public stackLevel: number = 0;
    public depth: number = 0;
    public expr: string = "";

    constructor(L: number, id: number, stack: number, expr: string, depth: number = 1) {
        super(DebugMessageId.ReqEvaluate);
        this.L = L;
        this.evalId = id;
        this.stackLevel = stack;
        this.expr = expr;
        this.depth = depth;
    }

    write(buf: ByteArray) {
        super.write(buf);
        buf.writeUint32(this.evalId);
        buf.writeUint32(this.stackLevel);
        buf.writeUint32(this.depth);
        buf.writeString(this.expr);
    }
}

export class DMRespEvaluate extends LuaAttachMessage {
    constructor() {
        super(DebugMessageId.RespEvaluate);
    }

    public evalId = 0;
    public success = true;
    public resultNode = new EvalResultNode();

    read(buf: ByteArray) {
        super.read(buf);
        this.evalId = buf.readInt32();
        this.success = buf.readBoolean();
        buf.readByte();//skip id
        this.resultNode.read({}, buf);
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

export interface LoadedScript {
	path: string;
	index: number;
	source?: string;
}

export interface LoadedScriptManager {
    findScript(path: string): LoadedScript | undefined;
    findScriptByIndex(index: number): LoadedScript | undefined;
}

export interface ExprEvaluator {
	eval(expr: string, stack?: number): Thenable<DMRespEvaluate>;
}

interface Context {

}

interface ComputeContext {
    evaluator: ExprEvaluator;
    handles: Handles<IStackNode>;
    scriptManager: LoadedScriptManager;
}

export interface IStackNode {
    parent: IStackNode | undefined;
    read(ctx: Context, buf: ByteArray): void;
    toVariable(ctx: ComputeContext): Variable;
    computeChildren(ctx: ComputeContext): Thenable<IStackNode[]>;
}

abstract class StackNode implements IStackNode {
    parent: IStackNode | undefined;

    abstract read(ctx: Context, buf: ByteArray): void;

    abstract toVariable(ctx: ComputeContext): Variable;

    computeChildren(ctx: ComputeContext): Thenable<IStackNode[]> {
        return Promise.resolve([]);
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

    toVariable() {
        return new Variable("NodeContainer", "");
    }

    computeChildren(ctx: ComputeContext): Thenable<IStackNode[]> {
        return Promise.resolve(this.children);
    }
}

export class StackRootNode extends StackNodeContainer {

    public scriptIndex = 0;
    public line = 0;
    public functionName = "";

    read(ctx: Context, buf: ByteArray) {
        super.read(ctx, buf);
        this.scriptIndex = buf.readInt32();
        this.line = buf.readInt32();
        this.functionName = buf.readString();
    }

    toVariable() {
        return new Variable("Root", "");
    }
}

export abstract class LuaXObjectValue extends StackNode {

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

    toVariable(ctx: ComputeContext): Variable {
        return new Variable(this.name, this.data);
    }
}

class LuaXTable extends LuaXObjectValue {

    public children = new Array<IStackNode>();

    private calcExpr() {
        var p: IStackNode | undefined = this;
        var list = [];
        while (p instanceof LuaXObjectValue) {
            const name = p.name;
            list.push(name);
            p = p.parent;
        }
        const head = list.pop();
        list = list.reverse().map(n => {
            if (n.startsWith('[')) {
                return n;
            } else {
                return `["${n}"]`;
            }
        });
        return head + list.join("");
    }

    read(ctx: Context, buf: ByteArray) {
        super.read(ctx, buf);
        const deep = buf.readBoolean();
        if (deep) {
            const size = buf.readSize();
            for (var i = 0; i < size; i++) {
                const key = <LuaXObjectValue> readNode(ctx, buf);
                const value = <LuaXObjectValue> readNode(ctx, buf);
                value.name = key.toKeyString();
                value.parent = this;
                this.children.push(value);
            }
        }
    }

    computeChildren(ctx: ComputeContext): Thenable<IStackNode[]> {
        if (this.children.length > 0) {
            return Promise.resolve(this.children);
        }
        return new Promise((resolve) => {
            let expr = this.calcExpr();
            ctx.evaluator.eval(expr).then(value => {
                const n = value.resultNode.children[0];
                if (n instanceof LuaXTable) {
                    this.children = n.children;
                    this.children.map(c => c.parent = this);
                }
                resolve(this.children);
            });
        });
    }

    toVariable(ctx: ComputeContext): DebugProtocol.Variable {
        let ref = ctx.handles.create(this);
        return { name: "table", value: "table", variablesReference: ref, type:"object" };
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

    toVariable(ctx: ComputeContext): Variable {
        var desc = "native";
        if (this.line >= 0 && this.script >= 0) {
            const script = ctx.scriptManager.findScriptByIndex(this.script);
            if (script) {
                desc = `line:${this.line}, script:${script.path}`;
            } else {
                desc = "unknown source";
            }
        }
        return new Variable(this.name, desc);
    }
}

class LuaXUserdata extends LuaXObjectValue {

}

export class EvalResultNode extends StackNodeContainer {
    public success = false;
    public error = "";

    read(ctx: Context, buf: ByteArray) {
        super.read(ctx, buf);
        this.success = buf.readBoolean();
        if (!this.success) {
            this.error = buf.readString();
        }
    }
}

export function readNode(ctx: Context, buf: ByteArray): IStackNode {
    const id = <StackNodeId> buf.readByte();
    var node: IStackNode | undefined;
    switch (id) {
        case StackNodeId.List: node = new StackNodeContainer(); break;
        case StackNodeId.StackRoot: node = new StackRootNode(); break;
        case StackNodeId.Eval: node = new EvalResultNode(); break;
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