/** returns the file name of given file path */
export const getFileName = (filePath: string): string => {
  if (filePath == null || filePath == "") {
    return "";
  }
  // remove any trailing slashes and whitespaces
  filePath = filePath.trim();
  while (filePath.endsWith("/") || filePath.endsWith("\\")) {
    filePath = filePath.slice(0, -1);
  }

  // Find the last occurrence of a slash
  const lastFSIndex = filePath.lastIndexOf("/");
  const lastBSIndex = filePath.lastIndexOf("\\");

  if (lastFSIndex > 0) {
    return filePath.substring(lastFSIndex + 1);
  } else if (lastBSIndex > 0) {
    return filePath.substring(lastBSIndex + 1);
  } else {
    return filePath;
  }
};
