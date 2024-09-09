export interface IASTBuilder<Instructions, Injection> {
    nodes: InstructionNode<Instructions, unknown>[];
    fromContent(content: string): InstructionNode<Instructions, unknown>[];
    getNode(identifier: string): InstructionNode<Instructions, unknown> | undefined;
    createChildren(tokens: string[], startAt: number, inject: Injection, stopAt?: Instructions[], limit?: Instructions[]): InstructionNode<Instructions, unknown>[];
}

export interface IInstructionParser<Instructions, Context> {
    instruction: Instructions;
    limited: boolean;
    nextIndex: number;
    arg: string;
    resetNextIndex(): void;
    check(): boolean;
    handle(): ReturnedInstructionNode<Instructions, Context>;
}

export type InstructionParserConstructor<Instructions, Context, Injection> = new (tokens: string[], startAt: number, astBuilder: IASTBuilder<Instructions, Injection>, injection: Injection) => IInstructionParser<Instructions, Context>;

export type InstructionNode<Instructions, Context = undefined> = {
    identifier?: string;
    endsAt: number;
    instruction: Instructions;
} & (Context extends undefined ? {} : { context: Context });

export type ReturnedInstructionNode<Instructions, Context = undefined> = Omit<InstructionNode<Instructions, Context>, "endsAt">;

export interface IGenerator {
    generate(nodes: InstructionNode<any, any>[]): Promise<string>;
    generateOne(node: InstructionNode<any, any>): Promise<string>;
}

export interface IInstructionGenerator {
    check(node: InstructionNode<any>): Promise<boolean>;
    handle(node: InstructionNode<any>): Promise<string>;
}

export type InstructionGeneratorConstructor = new (generator: IGenerator) => IInstructionGenerator;