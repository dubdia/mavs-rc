declare type ScriptContractV1_Shared = {
  mkDir(path: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  rmDir(path: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  listDir(path: string, options?: { recursive?: boolean; ignoreErrors?: boolean }): Promise<string[]>;
  dirExists(filePath: string, options?: { ignoreErrors?: boolean }): Promise<boolean>;

  writeFileText(filePath: string, contents: string,  options?: { ignoreErrors?: boolean }): Promise<void>;
  readFileText(filePath: string,  options?: { ignoreErrors?: boolean }): Promise<string>;
  readFileBuffer(filePath: string,  options?: { ignoreErrors?: boolean }): Promise<Buffer>;
  deleteFile(filePath: string,  options?: { ignoreErrors?: boolean }): Promise<void>;
  fileExists(filePath: string,  options?: { ignoreErrors?: boolean }): Promise<boolean>;

  move(oldPath: string, newPath: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  chown(path: string, uid: number, gid: number, options?: { ignoreErrors?: boolean }): Promise<void>;
  chmod(path: string, mode: number | string, options?: { ignoreErrors?: boolean }): Promise<void>;
  exec(command: string, options?: { ignoreErrors?: boolean }): Promise<{ stdout: string; stderr: string }>;
};
declare type ScriptContractV1_Remote = ScriptContractV1_Shared & {
    downloadFile(remoteFilePath: string, localFilePath: string, options?: {ignoreErrors?: boolean, overwrite?: boolean}): Promise<void>
    uploadFile(localFilePath: string, remoteFilePath: string, options?: {ignoreErrors?: boolean, overwrite?: boolean}): Promise<void>
};
declare type ScriptContractV1_Local = ScriptContractV1_Shared & {
    zipDirectory(sourcePath: string, targetZipPath: string, options?: {ignoreErrors?: boolean, overwrite?: boolean}): Promise<void>
    zipFile(sourceFilePath: string, targetZipPath: string, options?: {ignoreErrors?: boolean, overwrite?: boolean}): Promise<void>

    copyDir(sourcePath: string, targetPath: string, options?: { ignoreErrors?: boolean, overwrite?: boolean }): Promise<void>;
    copyFile(sourceFilePath: string, targetFilePath: string, options?: { ignoreErrors?: boolean, overwrite?: boolean }): Promise<void>;
};

declare namespace ScriptContractV1 { //global
  // constants
  const remoteId: string;
  const remoteName: string;

  // generic functions
  function alert(message: string | number | boolean | Date): void;
  function confirm(message: string | number | boolean | Date): boolean;
  function log(message: any, ...optionalParams: any[]): void;
  function delay(timeInMs: number): Promise<void>;

  // local & remote functions
  const local: ScriptContractV1_Local;
  const remote: ScriptContractV1_Remote;
}
