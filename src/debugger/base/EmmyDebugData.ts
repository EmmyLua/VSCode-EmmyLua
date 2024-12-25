import * as proto from "./EmmyDebugProto";
import { DebugProtocol } from "@vscode/debugprotocol";
import { Handles } from "@vscode/debugadapter";
// import iconv = require('iconv-lite');

export interface IEmmyStackContext {
    handles: Handles<IEmmyStackNode>;
    eval(expr: string, cacheId: number, depth: number): Promise<proto.IEvalRsp>;
}

export interface IEmmyStackNode {
    toVariable(ctx: IEmmyStackContext): DebugProtocol.Variable;
    computeChildren(ctx: IEmmyStackContext): Promise<Array<IEmmyStackNode>>;
}

export class EmmyStack implements IEmmyStackNode {
    constructor(
        private data: proto.IStack
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

export class EmmyStackENV implements IEmmyStackNode {
    constructor(
        private data: proto.IStack
    ) {
    }

    toVariable(ctx: IEmmyStackContext): DebugProtocol.Variable {
        throw new Error('Method not implemented.');
    }

    async computeChildren(ctx: IEmmyStackContext): Promise<Array<IEmmyStackNode>> {
        const variables = this.data.localVariables.concat(this.data.upvalueVariables);

        let variable = variables.find(variable => variable.name == "_ENV");
        if (variable) {
            const _ENV = new EmmyVariable(variable);
            return await _ENV.computeChildren(ctx);
        } else {
            const _GVariable = await ctx.eval("_G", 0, 1);
            if (_GVariable.success) {
                const _G = new EmmyVariable(_GVariable.value)
                return await _G.computeChildren(ctx);
            }
        }
        return [];
    }
}

export class EmmyVariable implements IEmmyStackNode {
    private variable: DebugProtocol.Variable;
    constructor(
        private data: proto.IVariable,
        private parent?: EmmyVariable,
    ) {
        let value = this.data.value;
        // vscode not implement this feature
        // let presentationHint: DebugProtocol.VariablePresentationHint = {
        //     kind: 'property',
        //     attributes: []
        // };
        switch (this.data.valueType) {
            case proto.ValueType.TSTRING:
                value = `"${this.data.value}"`;
                break;
            //     presentationHint.attributes?.push('rawString');
            //     break;
            // case proto.ValueType.TFUNCTION:
            //     presentationHint.kind = 'method';
            //     break;
        }
        let name = this.data.name;
        switch (this.data.nameType) {
            case proto.ValueType.TSTRING:
                // if (name.startsWith("_")) {
                //     presentationHint.attributes?.push('private');
                // }
                // else {
                //     presentationHint.attributes?.push('public');
                // }
                // if (!/^[\x00-\x7F]*$/.test(name)) {
                   
                // }
                break;
            case proto.ValueType.TNUMBER:
                name = `[${name}]`;
                // presentationHint.kind = 'data'
                break;
            default:
                name = `[${name}]`;
                break;
        }
        this.variable = { name, value, variablesReference: 0 };
    }

    toVariable(ctx: IEmmyStackContext): DebugProtocol.Variable {
        const ref = ctx.handles.create(this);
        if (this.data.valueType === proto.ValueType.TTABLE ||
            this.data.valueType === proto.ValueType.TUSERDATA ||
            this.data.valueType === proto.ValueType.GROUP) {
            this.variable.variablesReference = ref;
        }
        return this.variable;
    }

    private getExpr(): string {
        let arr: proto.IVariable[] = [];
        let n: EmmyVariable | undefined = this;
        while (n) {
            if (n.data.valueType !== proto.ValueType.GROUP) {
                arr.push(n.data);
            }
            n = n.parent;
        }
        arr = arr.reverse();
        return arr.map(it => it.name).join('.');
    }

    sortVariables(a: proto.IVariable, b: proto.IVariable): number {
        if (a.nameType < b.nameType) {
            return -1;
        } else if (a.nameType > b.nameType) {
            return 1;
        } else {
            if (a.nameType == proto.ValueType.TNUMBER) {
                return Number(a.name) - Number(b.name);
            }
            else {
                return a.name.localeCompare(b.name);
            }
        }
    }

    async computeChildren(ctx: IEmmyStackContext): Promise<IEmmyStackNode[]> {
        let children = this.data.children;
        if (this.data.valueType !== proto.ValueType.GROUP) {
            const evalResp = await ctx.eval(this.getExpr(), this.data.cacheId, 2);
            if (evalResp.success) {
                children = evalResp.value.children;
            }
        }
        if (children) {
            return children.sort(this.sortVariables).map(v => new EmmyVariable(v, this));
        }
        return [];
    }
}