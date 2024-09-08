export namespace EngineUtils {
    export function indent(code: string, spaces: number = 2): string {
        return code.split("\n").map(line => " ".repeat(spaces) + line).join("\n");
    }
}