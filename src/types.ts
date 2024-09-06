export interface IASTBuilder<Instructions> {
    fromToken(tokens: string[], startAt: number, limit?: Instructions[]): InstructionNode<Instructions> | undefined;
    fromContent(content: string): InstructionNode<Instructions>[];
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

export type InstructionParserConstructor<Instructions> = new (tokens: string[], startAt: number, astBuilder: IASTBuilder<Instructions>) => IInstructionParser<Instructions>;

export type InstructionNode<Instructions, Context = Record<any, any>> = {
    identifier?: string;
    context?: Context;
    endsAt?: number;
    value: Instructions;
};
