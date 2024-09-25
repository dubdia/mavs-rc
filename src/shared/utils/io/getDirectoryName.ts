/** returns the directory name of given file path */
export const getDirectoryName = (filePath: string): string => {
    if (filePath == null || filePath == '') {
        return '';
    }
    // Remove any trailing slashes
    const normalizedPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;

    // Find the last occurrence of a slash
    const lastSlashIndex = normalizedPath.lastIndexOf('/');

    // Return the substring from the start to the last slash
    if (lastSlashIndex === -1) {
        return ''; // No slashes found, implying the file is in the current directory
    } else {
        return normalizedPath.substring(0, lastSlashIndex);
    }
}