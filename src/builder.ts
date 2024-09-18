import { defaultsDeep } from "lodash";
import { IASTBuilder, InstructionNode, InstructionParserConstructor, InstructionVisitorConstructor, Traceable } from "./types";
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
    private tokens: string[];
    public nodes: InstructionNode<Instructions, unknown>[] = [];

    constructor(private content: string, private instructions: (InstructionParserConstructor<Instructions, any, Injection>)[], private visitors: (InstructionVisitorConstructor<Instructions, Injection>)[], private inject: Injection, options?: DeepPartial<Options<Instructions, Injection>>, public parent?: ASTBuilder<Instructions, Injection>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
        this.tokens = addSpacesAroundMatches(content, this.options.spaceOut).split(this.options.split);
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

        this.visit(node.endsAt);
    }

    createChildren(startAt: number, inject: Injection, stopAt?: Instructions[], limit?: Instructions[], options?: {
        missingStopError?: () => Error,
        childrenPrefix?: InstructionNode<Instructions, unknown>[],
    }): InstructionNode<Instructions, unknown>[] {
        const subASTBuilder = new ASTBuilder<Instructions, Injection>(this.content, this.instructions, this.visitors, inject, this.options, this);

        for (const child of options?.childrenPrefix || []) {
            subASTBuilder.addNode(child);
        }

        let index = startAt;

        while (true) {
            const nodeData = subASTBuilder.fromToken(this.content, this.tokens, index, inject, limit, [
                ...(limit || []),
                ...(stopAt || []),
            ]);

            if (!nodeData) {
                if (stopAt) {
                    if (this.tokens[index]) {
                        throw this.options.errors.instructionDoesntExist(this.tokens[index], index, this.tokens, this.getLineAndColumn(index), this.inject);
                    }
                    else {
                        throw options?.missingStopError ? options?.missingStopError() : this.options.errors.missingStopInstruction(stopAt);
                    }
                }
                else {
                    break;
                }
            }

            const [endsAt, instruction] = nodeData;

            index = endsAt + 1;

            // If there's no stopAt the loop runs only once
            if (!stopAt) {
                break;
            }

            // If the node is in the stopAt array, we break
            if (stopAt.includes(instruction)) {
                break;
            }
        }

        return subASTBuilder.nodes;
    }

    private visit(tokenNumber: number): void {
        for (const visitorConstructor of this.visitors) {
            const visitor = new visitorConstructor(this as IASTBuilder<Instructions, Injection>, this.inject);

            if (this.handleError(() => visitor.check(), visitor, tokenNumber)) {
                this.handleError(() => visitor.handle(), visitor, tokenNumber);
            }
        }
    }

    private handleError<T>(callback: () => T, instructionInstance: Traceable, tokenNumber: number): T {
        try {
            return callback();
        }
        catch (error) {
            if (error instanceof ChildError) {
                const trace = instructionInstance.trace(this.getLineAndColumn(tokenNumber));
                error.message += `\n${trace}`;
                throw error;
            }
            else {
                const trace = instructionInstance.trace(this.getLineAndColumn(tokenNumber));
                throw new ChildError(`${error}\n${trace}`);
            }
        }
    }

    private getLineAndColumn(tokenNumber: number): [number, number] {
        let line = 1;
        let column = 1;
        let currToken = 0;

        for (let i = 0; i < this.content.length; i++) {
            if (currToken > tokenNumber) {
                break;
            }

            if (this.content[i] === "\n") {
                line++;
                column = 1;
                continue;
            }

            if (this.tokens[currToken] === this.content.slice(i, i + this.tokens[currToken].length)) {
                i += this.tokens[currToken].length - 1;
                column += this.tokens[currToken].length;
                currToken++;
            }
            else {
                column++;
            }
        }

        return [line, column - this.tokens[tokenNumber].length];
    }

    private fromToken(content: string, tokens: string[], startAt: number, inject: Injection, limit?: Instructions[], allowedInstructions: Instructions[] = []): [number, Instructions] | undefined {
        if (startAt >= tokens.length) {
            return;
        }

        for (const instructionConstructor of this.instructions) {
            const instructionInstance = new instructionConstructor(content, tokens, startAt, this as IASTBuilder<Instructions, Injection>, inject);

            if (limit && !limit.includes(instructionInstance.instruction)) {
                continue;
            }

            if (instructionInstance.limited && !allowedInstructions.includes(instructionInstance.instruction)) {
                continue;
            }

            if (this.handleError(() => instructionInstance.check(), instructionInstance, startAt)) {
                instructionInstance.resetNextIndex();

                const returnedNode = this.handleError(() => instructionInstance.handle(), instructionInstance, startAt) as any; // TODO I have no idea how to fix this type

                if (returnedNode) {
                    this.addNode({
                        ...returnedNode,
                        endsAt: instructionInstance.nextIndex,
                    });
                }

                return [instructionInstance.nextIndex, instructionInstance.instruction];
            }
        }
    }

    build(): InstructionNode<Instructions, unknown>[] {

        let i = 0;

        while (i < this.tokens.length) {
            if (this.options.skipEmpty && !this.tokens[i]) {
                i++;
                continue;
            }

            const nodeData = this.fromToken(this.content, this.tokens, i, this.inject);

            if (!nodeData) {
                throw this.options.errors.instructionDoesntExist(this.tokens[i], i, this.tokens, this.getLineAndColumn(i), this.inject);
            }

            i = nodeData[0] + 1;
        }

        return this.nodes;
    }
}