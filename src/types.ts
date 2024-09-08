export interface IASTBuilder<InternalInstructionNode extends InstructionNode<any, any>, Instructions, Injection> {
    nodes: InternalInstructionNode[];
    fromContent(content: string): InternalInstructionNode[];
    getNode(identifier: string): InternalInstructionNode | undefined;
    createChildren(tokens: string[], startAt: number, inject: Injection, stopAt?: Instructions[], limit?: Instructions[]): InternalInstructionNode[];
}

export interface IInstructionParser<InternalInstructionNode extends InstructionNode<any, any>, Instructions> {
    instruction: Instructions;
    limited: boolean;
    nextIndex: number;
    arg: string;
    resetNextIndex(): void;
    check(): boolean;
    handle(): ReturnedInstructionNode<InternalInstructionNode>;
}

export type InstructionParserConstructor<InternalInstructionNode extends InstructionNode<any, any>, Instructions, Injection> = new (tokens: string[], startAt: number, astBuilder: IASTBuilder<InternalInstructionNode, Instructions, Injection>, injection: Injection) => IInstructionParser<InternalInstructionNode, Instructions>;

export type InstructionNode<Instructions, Context = undefined> = {
    identifier?: string;
    endsAt: number;
    addToAST: boolean;
    instruction: Instructions;
} & (Context extends undefined ? {} : { context: Context });

export type ReturnedInstructionNode<InternalInstructionNode extends InstructionNode<any, any>> = Omit<InternalInstructionNode, "addToAST" | "endsAt">;

export interface IGenerator {
    generate(nodes: InstructionNode<any, any>[]): Promise<string>;
    generateOne(node: InstructionNode<any, any>): Promise<string>;
}

export interface IInstructionGenerator {
    check(node: InstructionNode<any>): Promise<boolean>;
    handle(node: InstructionNode<any>): Promise<string>;
}

export type InstructionGeneratorConstructor = new (generator: IGenerator) => IInstructionGenerator;