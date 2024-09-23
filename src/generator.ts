import { IGenerator, IInstructionGenerator, InstructionGeneratorConstructor, InstructionNode } from "./types";

export class Generator implements IGenerator {

    constructor(private generators: InstructionGeneratorConstructor[]) {
    }

    async generateMany(nodes: InstructionNode<any, any>[]): Promise<string[]> {
        return (await Promise.all(nodes.map(async node => {
            return await this.generateOne(node);
        }))).filter(v => typeof v === "string") as string[];
    }

    async generateOne(node: InstructionNode<any, any>): Promise<string | null> {
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
    abstract handle(node: InternalInstructionNode): Promise<string | null>;
}