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


export class ASTBuilder<Instructions> implements IASTBuilder<Instructions> {
    private options: Options;

    constructor(private instructions: (InstructionParserConstructor<any /* I don't like the "any" here, but it requires some thought */>)[], options?: Partial<Options>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
    }

    fromToken(tokens: string[], startAt: number, limit?: Instructions[]): InstructionNode<Instructions> | undefined {
        for (let i = startAt; i < tokens.length; i++) {
            for (const instructionConstructor of this.instructions) {
                const instructionInstance = new instructionConstructor(tokens, i, this);

                if (limit && !limit.includes(instructionInstance.instruction)) {
                    continue;
                }

                if (!limit && instructionInstance.limited) {
                    continue;
                }

                if (instructionInstance.check()) {
                    instructionInstance.resetNextIndex();
                    const node = instructionInstance.handle();

                    node.endsAt = instructionInstance.nextIndex;

                    return node;
                }
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

            const node = this.fromToken(tokens, i);

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