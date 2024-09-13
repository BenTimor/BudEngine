export function escapeRegex(string: string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function addSpacesAroundMatches(content: string, stringList: string[]): string {
    // Escape and sort strings by length in descending order
    const sortedStrings = stringList
        .map(escapeRegex)
        .sort((a, b) => b.length - a.length);

    // Create a regex pattern that matches any of the strings
    const pattern = sortedStrings.join('|');
    const regex = new RegExp(pattern, 'g');

    // Replace matches with spaces around them
    content = content.replace(regex, match => ` ${match} `);

    // Clean up extra spaces
    return content;
}