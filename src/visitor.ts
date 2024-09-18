import { IASTBuilder, IInstructionVisitor } from "./types";

export abstract class InstructionVisitor<Instructions, Injection> implements IInstructionVisitor {
    constructor(protected astBuilder: IASTBuilder<Instructions, Injection>, protected injection: Injection) {}

    abstract check(): boolean;
    abstract handle(): void;
    abstract trace(cords: [number, number]): string;
}