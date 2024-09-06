export interface IASTBuilder<Instructions> {
    fromToken(tokens: string[], startAt: number): InstructionNode<Instructions> | undefined;
    fromContent(content: string): InstructionNode<Instructions>[];
}

export interface IInstructionParser<Instructions> {
    nextIndex: number;
    arg: string;
    resetNextIndex(): void;
    check(): boolean;
    handle(): InstructionNode<Instructions>;
}

export type InstructionParserConstructor<Instructions> = new (tokens: string[], startAt: number, astBuilder: IASTBuilder<Instructions>) => IInstructionParser<Instructions>;

export type InstructionNode<Instructions, Context = Record<any, any>> = {
    children: InstructionNode<Instructions>[];
    identifier?: string;
    context?: Context;
    endsAt?: number;
    value: Instructions;
};
