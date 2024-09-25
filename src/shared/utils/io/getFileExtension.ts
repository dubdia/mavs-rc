import { getFileName } from "./getFileName"

/** returns the file extension of given file path */
export const getFileExtension = (filePath: string): string => {
    const fileName = getFileName(filePath);
    if (fileName == null || fileName == '') {
        return '';
    }
    const dot = fileName.lastIndexOf('.');
    if (dot <= 0 || dot >= fileName.length - 1) {
        return '';
    }

    const ext = fileName.substring(dot);
    return ext;
}