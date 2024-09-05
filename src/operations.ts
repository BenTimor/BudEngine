import { IOperationParser, IParser, OperationNode } from "./types";

export abstract class OperationParser<Values> implements IOperationParser<Values> {
    public nextIndex: number;

    constructor(protected tokens: string[], protected startAt: number, protected parser: IParser<Values>) {
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
