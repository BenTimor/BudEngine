export interface IASTBuilder<Instructions, Injection> {
    fromToken(tokens: string[], startAt: number, inject: Injection, limit?: Instructions[]): InstructionNode<Instructions> | undefined;
    fromContent(content: string): InstructionNode<Instructions>[];
    getNode(identifier: string): InstructionNode<Instructions> | undefined;
}

export interface IInstructionParser<Instructions> {
    instruction: Instructions;
    limited: boolean;
    nextIndex: number;
    limitNext: Instructions[] | undefined;
    arg: string;
    resetNextIndex(): void;
    check(): boolean;
    handle(): InstructionNode<Instructions>;
    clearLimitNext(): void;
}

export type InstructionParserConstructor<Instructions, Injection> = new (tokens: string[], startAt: number, astBuilder: IASTBuilder<Instructions, Injection>, injection: Injection) => IInstructionParser<Instructions>;

export type InstructionNode<Instructions, Context = Record<any, any>> = {
    identifier?: string;
    context?: Context;
    endsAt?: number;
    instruction: Instructions;
};
