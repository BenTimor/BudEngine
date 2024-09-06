import { defaultsDeep } from "lodash";
import { IASTBuilder, InstructionNode, InstructionParserConstructor } from "./types";

type Options = {
    split: RegExp;
    skipEmpty: boolean;
};

const DefaultOptions: Options = {
    split: /\s+/g,
    skipEmpty: true,
};


export class ASTBuilder<Instructions, Injection> implements IASTBuilder<Instructions, Injection> {
    private options: Options;
    private nodesIndex: Record<string, InstructionNode<Instructions>> = {};

    constructor(private instructions: (InstructionParserConstructor<any /* I don't like the "any" here, but it requires some thought */, Injection>)[], private inject: Injection, options?: Partial<Options>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
    }

    getNode(identifier: string): InstructionNode<Instructions> | undefined {
        return this.nodesIndex[identifier];
    }

    fromToken(tokens: string[], startAt: number, inject: Injection, limit?: Instructions[]): InstructionNode<Instructions> | undefined {
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
                instructionInstance.clearLimitNext();
                const node = instructionInstance.handle();

                node.endsAt = instructionInstance.nextIndex;

                if (node.identifier) {
                    if (this.nodesIndex[node.identifier]) {
                        throw new Error(`Node with identifier ${node.identifier} already exists`);
                    }

                    this.nodesIndex[node.identifier] = node;
                }

                return node;
            }
        }
    }

    fromContent(content: string): InstructionNode<Instructions>[] {
        const nodes: InstructionNode<Instructions>[] = [];
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

            nodes.push(node);
        }

        return nodes;
    }
}