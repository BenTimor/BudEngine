import { IInstructionParser, IASTBuilder, InstructionNode } from "./types";

export abstract class InstructionParser<Instructions, Injection> implements IInstructionParser<Instructions> {
    abstract instruction: Instructions;
    limited: boolean = false;
    nextIndex: number;
    limitNext: Instructions[] | undefined;

    constructor(protected tokens: string[], protected startAt: number, protected astBuilder: IASTBuilder<Instructions, Injection>, protected injection: Injection) {
        this.nextIndex = startAt;
    }

    get arg() {
        return this.tokens[this.startAt];
    }

    resetNextIndex() {
        this.nextIndex = this.startAt;
    }

    clearLimitNext() {
        this.limitNext = undefined;
    }

    protected next(): InstructionNode<Instructions> | undefined {
        const on = this.astBuilder.fromToken(this.tokens, this.nextIndex + 1, this.injection, this.limitNext);

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
    abstract handle(): InstructionNode<Instructions>;
}
