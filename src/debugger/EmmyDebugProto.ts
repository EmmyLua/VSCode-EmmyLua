// describe debugger proto
export enum MessageCMD {
    Unknown,
    InitReq,
    InitRsp,

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
}

interface Message {
    cmd: MessageCMD;
}

export enum ValueType {
    VBool,
    VString,
    VTable,
    VFunction,
    VThread,
    VUserdata
}

export enum VariableNameType {
    NString, NNumber, NComplex, 
}

export interface Variable {
    type: ValueType;
    name: string;
    nameType: VariableNameType;
    value: string;
    valueType: string;
    children?: Variable[];
}

export interface Stack {
    level: number;
    file: string;
    functionName: string;
    line: number;
    localVariables: Variable[];
    upvalueVariables: Variable[];
}

export interface BreakPoint {
    file: string;
    line: number;
    condtion: string;
    hitCount: number;
}

export interface InitRsp {
    version: string;
}

// add breakpoint
export interface AddBreakPointReq {
    breakPoints: BreakPoint[];
}
export interface AddBreakPointRsp {
}

// remove breakpoint
export interface RemoveBreakPointReq {
    breakPoints: BreakPoint[];
}
export interface RemoveBreakPointRsp {
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
export interface ActionReq extends Message {
    action: DebugAction;
}
export interface ActionRsp {
}

// on break
export interface BreakNotify {
    stacks: Stack[];
}

export interface EvalReq extends Message {
    seq: number;
    expr: string;
    stackLevel: number;
    depth: number;
}

export interface EvalRsp {
    seq: number;
    success: boolean;
    error: string;
    value: Variable;
}