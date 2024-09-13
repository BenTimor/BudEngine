export class ChildError extends Error {
    public name = "ChildError";
    
    constructor(public message: string) {
        super(message);
    }
}