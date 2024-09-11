import { IASTBuilder, IInstructionVisitor } from "./types";

export abstract class InstructionVisitor<Instructions, Injection> implements IInstructionVisitor<Instructions> {
    constructor(protected astBuilder: IASTBuilder<Instructions, Injection>, protected injection: Injection) {}

    abstract check(): boolean;
    abstract handle(): void;
}