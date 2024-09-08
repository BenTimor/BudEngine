import { defaultsDeep } from "lodash";
import { IGenerator, IInstructionGenerator, InstructionGeneratorConstructor, InstructionNode } from "./types";

export interface GeneratorOptions {
    join: string;
}

const defaultOptions: GeneratorOptions = {
    join: "\n"
};

export class Generator implements IGenerator {
    private options: GeneratorOptions;

    constructor(private generators: InstructionGeneratorConstructor[], options?: Partial<GeneratorOptions>) {
        this.options = defaultsDeep(options, defaultOptions);
    }

    async generate(nodes: InstructionNode<any, any>[]): Promise<string> {
        return (await Promise.all(nodes.map(async node => {
            for (const generatorConst of this.generators) {
                const generator = new generatorConst(this);

                if (await generator.check(node)) {
                    return await generator.handle(node);
                }
            }

            throw new Error(`No generator found for node: ${JSON.stringify(node)}`);
        }))).join(this.options.join);
    }

    generateOne(node: InstructionNode<any, any>): Promise<string> {
        return this.generate([node]);
    }
}

export abstract class InstructionGenerator<InternalInstructionNode extends InstructionNode<any, any>> implements IInstructionGenerator {
    constructor(protected generator: IGenerator) {}

    abstract check(node: InternalInstructionNode): Promise<boolean>;
    abstract handle(node: InternalInstructionNode): Promise<string>;
}