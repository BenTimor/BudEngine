import { defaultsDeep } from "lodash";
import { IASTBuilder, InstructionNode, InstructionParserConstructor, ReturnedInstructionNode } from "./types";

type Options = {
    split: RegExp;
    skipEmpty: boolean;
};

const DefaultOptions: Options = {
    split: /\s+/g,
    skipEmpty: true,
};


export class ASTBuilder<InternalInstructionNode extends InstructionNode<any, any>, Instructions, Injection> implements IASTBuilder<InternalInstructionNode, Instructions, Injection> {
    private options: Options;
    private nodesIndex: Record<string, InternalInstructionNode> = {};
    public nodes: InternalInstructionNode[] = [];

    constructor(private instructions: (InstructionParserConstructor<InternalInstructionNode, Instructions, Injection>)[], private inject: Injection, options?: Partial<Options>, private parent?: ASTBuilder<InternalInstructionNode, Instructions, Injection>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
    }

    getNode(identifier: string): InternalInstructionNode | undefined {
        return this.nodesIndex[identifier] ?? this.parent?.getNode(identifier);
    }

    createChildren(tokens: string[], startAt: number, inject: Injection, stopAt?: Instructions[], limit?: Instructions[]): InternalInstructionNode[] {
        const subASTBuilder = new ASTBuilder<InternalInstructionNode, Instructions, Injection>(this.instructions, inject, this.options, this);

        let index = startAt;

        while (true) {
            const node = subASTBuilder.fromToken(tokens, index, inject, limit);

            // No node and we didn't break yet? Then there's an error
            if (!node) {                                
                throw new Error("Syntax error");
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

    private fromToken(tokens: string[], startAt: number, inject: Injection, limit?: Instructions[]): InternalInstructionNode | undefined {
        for (const instructionConstructor of this.instructions) {
            const instructionInstance = new instructionConstructor(tokens, startAt, this, inject);

            if (limit && !limit.includes(instructionInstance.instruction)) {
                continue;
            }

            if (!limit && instructionInstance.limited) {
                continue;
            }

            if (instructionInstance.check()) {
                instructionInstance.resetNextIndex();

                const returnedNode = instructionInstance.handle() as any; // TODO I have no idea how to fix this type

                const node: InternalInstructionNode = {
                    ...returnedNode,
                    endsAt: instructionInstance.nextIndex,
                };

                if (node.identifier) {
                    if (this.nodesIndex[node.identifier]) {
                        throw new Error(`Node with identifier ${node.identifier} already exists`);
                    }

                    this.nodesIndex[node.identifier] = node;
                }

                this.nodes.push(node);

                return node;
            }
        }
    }

    fromContent(content: string): InternalInstructionNode[] {
        const tokens = content.split(this.options.split);

        let i = 0;

        while (i < tokens.length) {
            if (this.options.skipEmpty && !tokens[i]) {
                i++;
                continue;
            }

            const node = this.fromToken(tokens, i, this.inject);

            if (!node) {
                throw new Error("Syntax error");
            }

            if (node.endsAt === undefined) {
                throw new Error("Syntax error");
            }

            i = node.endsAt + 1;
        }

        return this.nodes;
    }
}