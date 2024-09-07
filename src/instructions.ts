import { IInstructionParser, IASTBuilder, InstructionNode, ReturnedInstructionNode } from "./types";

export abstract class InstructionParser<InternalInstructionNode extends InstructionNode<any, any>, Instructions, Injection> implements IInstructionParser<InternalInstructionNode, Instructions> {
    abstract instruction: Instructions;
    limited: boolean = false;
    nextIndex: number;

    constructor(protected tokens: string[], protected startAt: number, protected astBuilder: IASTBuilder<InternalInstructionNode, Instructions, Injection>, protected injection: Injection) {
        this.nextIndex = startAt;
    }

    get arg() {
        return this.tokens[this.startAt];
    }

    resetNextIndex() {
        this.nextIndex = this.startAt;
    }

    protected nextChildren(limitNext?: Instructions[], stopAt?: Instructions[]): InternalInstructionNode[] {
        const children = this.astBuilder.createChildren(this.tokens, this.nextIndex + 1, this.injection, stopAt, limitNext);

        if (children.length === 0) {
            return [];
        }

        this.nextIndex = children[children.length - 1].endsAt;

        return children;
    }

    protected next(limitNext?: Instructions[]): InternalInstructionNode | undefined {
        try {
            return this.nextChildren(limitNext)[0]; // TODO Make sure we catch only "no children" error
        }
        catch {
            return;
        }
    }

    abstract check(): boolean;
    abstract handle(): ReturnedInstructionNode<InternalInstructionNode>;
}
