import { defaultsDeep } from "lodash";
import { IGenerator, IInstructionGenerator, InstructionGeneratorConstructor, InstructionNode } from "./types";
import { DeepPartial } from "./utils";

export interface GeneratorOptions {
    generator: {
        join: string;
        prefix: string;
        suffix: string;
    };
}

const defaultOptions: GeneratorOptions = {
    generator: {
        join: "",
        prefix: "",
        suffix: "",
    }
};

export class Generator implements IGenerator {
    private options: GeneratorOptions;

    constructor(private generators: InstructionGeneratorConstructor[], options?: DeepPartial<GeneratorOptions>) {
        this.options = defaultsDeep(options, defaultOptions);
    }

    async generate(nodes: InstructionNode<any, any>[]): Promise<string> {
        return this.options.generator.prefix + (await Promise.all(nodes.map(async node => {
            return await this.generateOne(node);
        }))).join(this.options.generator.join) + this.options.generator.suffix;
    }

    async generateOne(node: InstructionNode<any, any>): Promise<string> {
        for (const generatorConst of this.generators) {
            const generator = new generatorConst(this);

            if (await generator.check(node)) {
                return await generator.handle(node);
            }
        }

        throw new Error(`No generator found for node: ${JSON.stringify(node)}`);
    }
}

export abstract class InstructionGenerator<InternalInstructionNode extends InstructionNode<any, any>> implements IInstructionGenerator {
    constructor(protected generator: IGenerator) { }

    abstract check(node: InternalInstructionNode): Promise<boolean>;
    abstract handle(node: InternalInstructionNode): Promise<string>;
}