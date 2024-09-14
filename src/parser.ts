import { IInstructionParser, IASTBuilder, InstructionNode, ReturnedInstructionNode } from "./types";

export abstract class InstructionParser<Instructions, Context, Injection> implements IInstructionParser<Instructions, Context> {
    abstract instruction: Instructions;
    limited: boolean = false;
    nextIndex: number;

    constructor(protected content: string, protected tokens: string[], protected startAt: number, protected astBuilder: IASTBuilder<Instructions, Injection>, protected injection: Injection /* TODO Put injection in a proxy and allow to change it only by assignment to this.injection but without changing the internal fields individiaully */) {
        this.nextIndex = startAt;
    }

    get arg() {
        return this.tokens[this.startAt];
    }

    resetNextIndex() {
        this.nextIndex = this.startAt;
    }

    protected nextChildren(limitNext?: Instructions[], stopAt?: Instructions[], missingStopError?: () => Error): InstructionNode<Instructions, unknown>[] {
        const children = this.astBuilder.createChildren(this.content, this.tokens, this.nextIndex + 1, this.injection, stopAt, limitNext, missingStopError);

        if (children.length === 0) {
            return [];
        }

        this.nextIndex = children[children.length - 1].endsAt;

        return children as InstructionNode<Instructions, unknown>[];
    }

    protected next(limitNext?: Instructions[]): InstructionNode<Instructions, unknown> | undefined {
        return this.nextChildren(limitNext)[0];
    }

    abstract check(): boolean;
    abstract handle(): ReturnedInstructionNode<Instructions, Context>;    
    abstract trace(cords: [number, number]): string;
}
