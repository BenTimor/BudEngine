import { IInstructionParser, IASTBuilder, InstructionNode } from "./types";

export abstract class InstructionParser<Instructions> implements IInstructionParser<Instructions> {
    public nextIndex: number;

    constructor(protected tokens: string[], protected startAt: number, protected astBuilder: IASTBuilder<Instructions>) {
        this.nextIndex = startAt;
    }

    get arg() {
        return this.tokens[this.startAt];
    }

    resetNextIndex() {
        this.nextIndex = this.startAt;
    }

    protected next(): InstructionNode<Instructions> | undefined {
        const on = this.astBuilder.fromToken(this.tokens, this.nextIndex + 1);

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
