import * as proto from "./EmmyDebugProto";
import { DebugProtocol } from "vscode-debugprotocol";
import { Handles } from "vscode-debugadapter";

export interface IEmmyStackContext {
    handles: Handles<IEmmyStackNode>;
    eval(expr: string, depth: number): Promise<proto.Variable | null>;
}

export interface IEmmyStackNode {
    toVariable(ctx: IEmmyStackContext): DebugProtocol.Variable;
    computeChildren(ctx: IEmmyStackContext): Promise<Array<IEmmyStackNode>>;
}

export class EmmyStack implements IEmmyStackNode {
    constructor(
        private data: proto.Stack
    ) {
    }

    toVariable(ctx: IEmmyStackContext): DebugProtocol.Variable {
        throw new Error('Method not implemented.');
    }

    async computeChildren(ctx: IEmmyStackContext): Promise<Array<IEmmyStackNode>> {
        const variables = this.data.localVariables.concat(this.data.upvalueVariables);
        return variables.map(v => {
            return new EmmyVariable(v);
        });
    }
}

export class EmmyVariable implements IEmmyStackNode {
    private variable: DebugProtocol.Variable;

    constructor(
        private data: proto.Variable,
        private parent?: EmmyVariable,
    ) {
        this.variable = { name: this.data.name, value: this.data.value, variablesReference: 0 };
    }

    toVariable(ctx: IEmmyStackContext): DebugProtocol.Variable {
        const ref = ctx.handles.create(this);
        if (this.data.valueType === 'table' ||
            this.data.valueType === 'userdata') {
            this.variable.variablesReference = ref;
        }
        return this.variable;
    }
    
    private getExpr(): string {
        let arr: proto.Variable[] = [];
        let n: EmmyVariable | null = this;
        while (n) {
            arr.push(n.data);
            n = n.parent;
        }
        arr = arr.reverse();
        return arr.map(it => it.name).join('.');
    }

    async computeChildren(ctx: IEmmyStackContext): Promise<IEmmyStackNode[]> {
        const evalResult = await ctx.eval(this.getExpr(), 2);
        if (evalResult && evalResult.children) {
            return evalResult.children.map(v => new EmmyVariable(v, this));
        }
        return [];
    }
}