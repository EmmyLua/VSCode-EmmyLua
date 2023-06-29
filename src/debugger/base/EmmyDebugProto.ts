// describe debugger proto
export enum MessageCMD {
    Unknown,

    InitReq,
    InitRsp,

    ReadyReq,
    ReadyRsp,

    AddBreakPointReq,
    AddBreakPointRsp,

    RemoveBreakPointReq,
    RemoveBreakPointRsp,

    ActionReq,
    ActionRsp,

    EvalReq,
    EvalRsp,

    // lua -> ide
    BreakNotify,
    AttachedNotify,

    StartHookReq,
    StartHookRsp,

    LogNotify,
}

export interface IMessage {
    cmd: MessageCMD;
}

export enum ValueType {
    TNIL,
    TBOOLEAN,
    TLIGHTUSERDATA,
    TNUMBER,
    TSTRING,
    TTABLE,
    TFUNCTION,
    TUSERDATA,
    TTHREAD,

    GROUP,
}

export enum VariableNameType {
    NString, NNumber, NComplex, 
}

export interface IVariable {
    name: string;
    nameType: ValueType;
    value: string;
    valueType: ValueType;
    valueTypeName: string;
    cacheId: number;
    children?: IVariable[];
}

export interface IStack {
    file: string;
    line: number;
    functionName: string;
    level: number;
    localVariables: IVariable[];
    upvalueVariables: IVariable[];
}

export interface IBreakPoint {
    file: string;
    line: number;
    /** An optional expression for conditional breakpoints. */
    condition?: string;
    /** An optional expression that controls how many hits of the breakpoint are ignored. The backend is expected to interpret the expression as needed. */
    hitCondition?: string;
    /** If this attribute exists and is non-empty, the backend must not 'break' (stop) but log the message instead. Expressions within {} are interpolated. */
    logMessage?: string;
}

export interface IInitReq extends IMessage {
    emmyHelper: string;
    ext: string[];
}
export interface InitRsp {
    version: string;
}

// add breakpoint
export interface IAddBreakPointReq extends IMessage {
    breakPoints: IBreakPoint[];
    clear: boolean;
}
export interface IAddBreakPointRsp {
}

// remove breakpoint
export interface IRemoveBreakPointReq {
    breakPoints: IBreakPoint[];
}
export interface IRemoveBreakPointRsp {
}

export enum DebugAction {
    Break,
    Continue,
    StepOver,
    StepIn,
    StepOut,
    Stop,
}

// break, continue, step over, step into, step out, stop
export interface IActionReq extends IMessage {
    action: DebugAction;
}
export interface IActionRsp {
}

// on break
export interface IBreakNotify {
    stacks: IStack[];
}

export interface IEvalReq extends IMessage {
    seq: number;
    expr: string;
    stackLevel: number;
    depth: number;
    cacheId: number;
    value?: string;
    setValue?: boolean;
}

export interface IEvalRsp {
    seq: number;
    success: boolean;
    error: string;
    value: IVariable;
}