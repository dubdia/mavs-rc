import { TabName } from "../models/TabName";

/** returns the identifier for the file with given params  */
export const getFileTabName = (id: string, filePath: string): TabName => {
    const suffix = id + filePath;
    return `file-${suffix}`;
}