export const escapeUnixShellArg = (filePath: string): string => {
    // Replace each instance of ' with '\'' (end string, escape quote, start string)
    const escapedPath = filePath.replace(/'/g, "'\\''");
    // Wrap the result in single quotes
    return `'${escapedPath}'`;
}