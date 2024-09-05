import { defaultsDeep } from "lodash";

export class OperationNode<Values, Context = Record<any, any>> {
    public children: OperationNode<Values>[] = [];
    public identifier?: string;
    public context?: Context;
    public endsAt?: number;

    constructor(public value: Values) { }
}

export abstract class OperationParser<Values> {
    public nextIndex: number;

    constructor(protected tokens: string[], protected startAt: number, protected parser: Parser<Values>) {
        this.nextIndex = startAt;
    }

    get arg() {
        return this.tokens[this.startAt];
    }

    resetNextIndex() {
        this.nextIndex = this.startAt;
    }

    protected next(): OperationNode<Values> | undefined {
        const on = this.parser.parseNext(this.tokens, this.nextIndex + 1);

        if (!on) {
            return;
        }

        if (!on.endsAt) {
            throw new Error("Syntax error");
        }

        this.nextIndex = on.endsAt;

        return on;
    }

    abstract check(): boolean;
    abstract handle(): OperationNode<Values>;
}

type Options = {
    split: RegExp;
};

const DefaultOptions: Options = {
    split: /\s+/g,
};

type OperationParserConstructor<Values> = new (tokens: string[], startAt: number, parser: Parser<Values>) => OperationParser<Values>;

export class Parser<Values> {
    private options: Options;

    constructor(private operations: (OperationParserConstructor<Values>)[], options?: Partial<Options>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
    }

    parseNext(tokens: string[], startAt: number): OperationNode<Values> | undefined {
        for (let i = startAt; i < tokens.length; i++) {
            for (const operation of this.operations) {
                const instance = new operation(tokens, i, this);

                if (instance.check()) {
                    instance.resetNextIndex();
                    const node = instance.handle();

                    node.endsAt = instance.nextIndex;

                    return node;
                }
            }
        }
    }

    parseContent(content: string): OperationNode<Values>[] {
        const nodes: OperationNode<Values>[] = [];
        const tokens = content.split(this.options.split);

        let i = 0;

        while (i < tokens.length) {
            const node = this.parseNext(tokens, i);

            if (!node) {
                throw new Error("Syntax error");
            }

            if (!node.endsAt) {
                throw new Error("Syntax error");
            }

            i = node.endsAt + 1;

            nodes.push(node);
        }

        return nodes;
    }
}