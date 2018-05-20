
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

export class LuaAttachMessage {
    id: DebugMessageId;

    constructor(id: DebugMessageId) {
        this.id = id;
    }

    public write(buf: Buffer) {

    }
}

export class DMReqInitialize extends LuaAttachMessage {
    emmyLuaFile: string;
    captureStd:boolean;
    captureOutputDebugString:boolean;
    
    constructor(symbolsDirectory:string,
        emmyLuaFile: string,
        captureStd:boolean,
        captureOutputDebugString:boolean = false) {
        super(DebugMessageId.ReqInitialize);
        this.emmyLuaFile = emmyLuaFile;
        this.captureStd = captureStd;
        this.captureOutputDebugString = captureOutputDebugString;
    }

    public write(buf: Buffer) {
        super.write(buf);

    }
}