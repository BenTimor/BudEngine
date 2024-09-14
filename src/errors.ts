export class BudEngineError extends Error {
    public name = "BudEngineError";

    constructor(public message: string) {
        super(message);
    }
}

export class ChildError extends BudEngineError {
    public name = "ChildError";
    
    constructor(public message: string) {
        super(message);
    }
}

export class DuplicateIdentifierError extends BudEngineError {
    public name = "DuplicateIdentifierError";

    constructor(identifier: string) {
        super(`Two node identifiers with the name ${identifier} were found`);
    }
}