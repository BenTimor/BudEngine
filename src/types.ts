export interface IASTBuilder<Instructions, Injection> {
    nodes: InstructionNode<Instructions, unknown>[];
    fromContent(content: string): InstructionNode<Instructions, unknown>[];
    getNode(identifier: string): InstructionNode<Instructions, unknown> | undefined;
    createChildren(content: string, tokens: string[], startAt: number, inject: Injection, stopAt?: Instructions[], limit?: Instructions[], options?: {
        missingStopError?: () => Error,
        childrenPrefix?: InstructionNode<Instructions, unknown>[],
    }): InstructionNode<Instructions, unknown>[];
    addNode(node: InstructionNode<Instructions, unknown>): void;
}

export interface IInstructionParser<Instructions, Context> {
    instruction: Instructions;
    limited: boolean;
    nextIndex: number;
    arg: string; // TODO Rename to token
    resetNextIndex(): void;
    check(): boolean;
    handle(): ReturnedInstructionNode<Instructions, Context>;
    trace(cords: [number, number]): string;
}

export interface IInstructionVisitor {
    check(): boolean;
    handle(): void;
}

export type InstructionParserConstructor<Instructions, Context, Injection> = new (content: string, tokens: string[], startAt: number, astBuilder: IASTBuilder<Instructions, Injection>, injection: Injection) => IInstructionParser<Instructions, Context>;

export type InstructionVisitorConstructor<Instructions, Injection> = new (astBuilder: IASTBuilder<Instructions, Injection>, injection: Injection) => IInstructionVisitor;

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
