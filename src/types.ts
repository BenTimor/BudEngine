export interface IParser<Values> {
    parseNext(tokens: string[], startAt: number): OperationNode<Values> | undefined;
    parseContent(content: string): OperationNode<Values>[];
}

export interface IOperationParser<Values> {
    nextIndex: number;
    arg: string;
    resetNextIndex(): void;
    check(): boolean;
    handle(): OperationNode<Values>;
}

export type OperationParserConstructor<Values> = new (tokens: string[], startAt: number, parser: IParser<Values>) => IOperationParser<Values>;

export type OperationNode<Values, Context = Record<any, any>> = {
    children: OperationNode<Values>[];
    identifier?: string;
    context?: Context;
    endsAt?: number;
    value: Values;
};
