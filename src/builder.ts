import { defaultsDeep } from "lodash";
import { IASTBuilder, IInstructionParser, InstructionNode, InstructionParserConstructor, InstructionVisitorConstructor } from "./types";
import { ChildError, DuplicateIdentifierError } from "./errors";
import { addSpacesAroundMatches, DeepPartial } from "./utils";

type Options<Instructions, Injection> = {
    split: RegExp;
    skipEmpty: boolean;
    spaceOut: string[];
    errors: {
        missingStopInstruction: (stopAt: Instructions[]) => Error;
        instructionDoesntExist: (token: string, tokenIndex: number, tokens: string[], cords: number[], inject: Injection) => Error;
    }
};

const DefaultOptions: Options<unknown, unknown> = {
    split: /\s+/g, // TODO Either stop supporting this or integrate it into the errors and spaceOut correctly
    skipEmpty: true,
    spaceOut: [],
    errors: {
        missingStopInstruction: () => new Error(`Missing stop instruction`),
        instructionDoesntExist: (token) => new Error(`Instruction ${token} doesn't exist.`),
    }
};

export class ASTBuilder<Instructions, Injection> implements IASTBuilder<Instructions, Injection> {
    private options: Options<Instructions, Injection>;
    private nodesIndex: Record<string, InstructionNode<Instructions, unknown>> = {};
    public nodes: InstructionNode<Instructions, unknown>[] = [];

    constructor(private instructions: (InstructionParserConstructor<Instructions, any, Injection>)[], private visitors: (InstructionVisitorConstructor<Instructions, Injection>)[], private inject: Injection, options?: DeepPartial<Options<Instructions, Injection>>, private parent?: ASTBuilder<Instructions, Injection>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
    }

    getNode(identifier: string): InstructionNode<Instructions, unknown> | undefined {
        return this.nodesIndex[identifier] ?? this.parent?.getNode(identifier);
    }

    addNode(node: InstructionNode<Instructions, unknown>): void {
        if (node.identifier) {
            if (this.nodesIndex[node.identifier]) {
                throw new DuplicateIdentifierError(node.identifier);
            }

            this.nodesIndex[node.identifier] = node;
        }

        this.nodes.push(node);
    }

    createChildren(content: string, tokens: string[], startAt: number, inject: Injection, stopAt?: Instructions[], limit?: Instructions[], options?: {
        missingStopError?: () => Error,
        childrenPrefix?: InstructionNode<Instructions, unknown>[],
    }): InstructionNode<Instructions, unknown>[] {
        const subASTBuilder = new ASTBuilder<Instructions, Injection>(this.instructions, this.visitors, inject, this.options, this);

        for (const child of options?.childrenPrefix || []) {
            subASTBuilder.addNode(child);
        }

        let index = startAt;

        while (true) {
            const node = subASTBuilder.fromToken(content, tokens, index, inject, limit, [
                ...(limit || []),
                ...(stopAt || []),
            ]);

            if (!node) {
                if (stopAt) {
                    if (tokens[index]) {
                        throw this.options.errors.instructionDoesntExist(tokens[index], index, tokens, this.getLineAndColumn(content, index, tokens), this.inject);
                    }
                    else {
                        throw options?.missingStopError ? options?.missingStopError() : this.options.errors.missingStopInstruction(stopAt);
                    }
                }
                else {
                    break;
                }
            }

            index = node.endsAt + 1;

            // If there's no stopAt the loop runs only once
            if (!stopAt) {
                break;
            }

            // If the node is in the stopAt array, we break
            if (stopAt.includes(node.instruction)) {
                break;
            }
        }

        return subASTBuilder.nodes;
    }

    private visit(instructionInstance: IInstructionParser<Instructions, any>, content: string, tokenNumber: number, tokens: string[]): void {
        for (const visitorConstructor of this.visitors) {
            const visitor = new visitorConstructor(this as IASTBuilder<Instructions, Injection>, this.inject);

            if (this.handleError(() => visitor.check(), instructionInstance, content, tokenNumber, tokens)) {
                this.handleError(() => visitor.handle(), instructionInstance, content, tokenNumber, tokens);
            }
        }
    }

    private handleError<T>(callback: () => T, instructionInstance: IInstructionParser<Instructions, any>, content: string, tokenNumber: number, tokens: string[]): T {
        try {
            return callback();
        }
        catch (error) {
            if (error instanceof ChildError) {
                const trace = instructionInstance.trace(this.getLineAndColumn(content, tokenNumber, tokens));
                error.message += `\n${trace}`;
                throw error;
            }
            else {
                const trace = instructionInstance.trace(this.getLineAndColumn(content, tokenNumber, tokens));
                throw new ChildError(`${error}\n${trace}`);
            }
        }
    }

    private getLineAndColumn(content: string, tokenNumber: number, tokens: string[]): [number, number] {
        let line = 1;
        let column = 1;
        let currToken = 0;

        for (let i = 0; i < content.length; i++) {
            if (currToken > tokenNumber) {
                break;
            }

            if (content[i] === "\n") {
                line++;
                column = 1;
                continue;
            }

            if (tokens[currToken] === content.slice(i, i + tokens[currToken].length)) {
                i += tokens[currToken].length - 1;
                column += tokens[currToken].length;
                currToken++;
            }
            else {
                column++;
            }
        }

        return [line, column - tokens[tokenNumber].length];
    }

    private fromToken(content: string, tokens: string[], startAt: number, inject: Injection, limit?: Instructions[], allowedInstructions: Instructions[] = []): InstructionNode<Instructions, any> | undefined {
        if (startAt >= tokens.length) {
            return undefined;
        }

        for (const instructionConstructor of this.instructions) {
            const instructionInstance = new instructionConstructor(content, tokens, startAt, this as IASTBuilder<Instructions, Injection>, inject);

            if (limit && !limit.includes(instructionInstance.instruction)) {
                continue;
            }

            if (instructionInstance.limited && !allowedInstructions.includes(instructionInstance.instruction)) {
                continue;
            }

            if (this.handleError(() => instructionInstance.check(), instructionInstance, content, startAt, tokens)) {
                instructionInstance.resetNextIndex();

                const returnedNode = this.handleError(() => instructionInstance.handle(), instructionInstance, content, startAt, tokens) as any; // TODO I have no idea how to fix this type

                const node: InstructionNode<Instructions, unknown> = {
                    ...returnedNode,
                    endsAt: instructionInstance.nextIndex,
                };

                if (node.identifier) {
                    if (this.nodesIndex[node.identifier]) {
                        throw new DuplicateIdentifierError(node.identifier);
                    }

                    this.nodesIndex[node.identifier] = node;
                }

                this.nodes.push(node);

                this.visit(instructionInstance, content, startAt, tokens);

                return node;
            }
        }
    }

    fromContent(content: string): InstructionNode<Instructions, unknown>[] {
        const tokens = addSpacesAroundMatches(content, this.options.spaceOut).split(this.options.split);

        let i = 0;

        while (i < tokens.length) {
            if (this.options.skipEmpty && !tokens[i]) {
                i++;
                continue;
            }

            const node = this.fromToken(content, tokens, i, this.inject);

            if (!node) {
                throw this.options.errors.instructionDoesntExist(tokens[i], i, tokens, this.getLineAndColumn(content, i, tokens), this.inject);
            }

            i = node.endsAt + 1;
        }

        return this.nodes;
    }
}