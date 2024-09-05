import { defaultsDeep } from "lodash";
import { IParser, OperationNode, OperationParserConstructor } from "./types";

type Options = {
    split: RegExp;
    skipEmpty?: boolean;
};

const DefaultOptions: Options = {
    split: /\s+/g,
    skipEmpty: true,
};


export class Parser<Values> implements IParser<Values> {
    private options: Options;

    constructor(private operations: (OperationParserConstructor<Values>)[], options?: Partial<Options>) {
        this.options = defaultsDeep(options || {}, DefaultOptions);
    }

    parseNext(tokens: string[], startAt: number): OperationNode<Values> | undefined {
        for (let i = startAt; i < tokens.length; i++) {
            for (const operation of this.operations) {
                const instance = new operation(tokens, i, this);

                if (instance.check()) {
                    instance.resetNextIndex();
                    const node = instance.handle();

                    node.endsAt = instance.nextIndex;

                    return node;
                }
            }
        }
    }

    parseContent(content: string): OperationNode<Values>[] {
        const nodes: OperationNode<Values>[] = [];
        const tokens = content.split(this.options.split);

        let i = 0;

        while (i < tokens.length) {
            if (this.options.skipEmpty && !tokens[i]) {
                i++;
                continue;
            }

            const node = this.parseNext(tokens, i);

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