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
    constructor() {
        super(DebugMessageId.AddBreakpoint);
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