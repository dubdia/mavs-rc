/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */
declare type ScriptContractV1_Stats = {
  path: string;

  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: number;
  mtime: number;

  isDirectory: boolean;
  isFile: boolean;
  isBlockDevice: boolean;
  isCharacterDevice: boolean;
  isSymbolicLink: boolean;
  isFIFO: boolean;
  isSocket: boolean;
}

declare type ScriptContractV1_Shared = {
  mkDir(path: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  rmDir(path: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  listDir(path: string, options?: { recursive?: boolean; ignoreErrors?: boolean }): Promise<string[]>;
  dirExists(path: string, options?: { ignoreErrors?: boolean }): Promise<boolean>;

  writeFileText(filePath: string, contents: string,  options?: { ignoreErrors?: boolean }): Promise<void>;
  readFileText(filePath: string, options?: { ignoreErrors?: boolean }): Promise<string>;
  readFileBuffer(filePath: string, options?: { ignoreErrors?: boolean }): Promise<Buffer>;
  deleteFile(filePath: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  fileExists(filePath: string, options?: { ignoreErrors?: boolean }): Promise<boolean>;

  stats(path: string, options?: { ignoreErrors?: boolean }): Promise<ScriptContractV1_Stats | null>;
  move(oldPath: string, newPath: string, options?: { ignoreErrors?: boolean }): Promise<void>;
  chown(path: string, uid: number, gid: number, options?: { ignoreErrors?: boolean }): Promise<void>;
  chmod(path: string, mode: number | string, options?: { ignoreErrors?: boolean }): Promise<void>;
  exec(command: string, options?: { ignoreErrors?: boolean }): Promise<{ stdout: string; stderr: string }>;

  isAbsolutePath(path: string): boolean;
  joinPath(...paths: string[]): string;
  getDirName(path: string): string;
  getFileName(path: string): string;
  getExtension(path: string): string;
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
  
    resolvePath(...paths: string[]): string;
    normalizePath(path: string): string;
};

declare namespace ScriptContractV1 { //global
  // constants
  const remoteId: string;
  const remoteName: string;
  const remotePosixType: ('posix' | 'windows');
  
  const scriptId: string;
  const scriptName: string;


  // generic functions
  function alert(message: string | number | boolean | Date): void;
  function confirm(message: string | number | boolean | Date): boolean;
  function prompt(message: string | number | boolean | Date, options?: { defaultText?: string, label?: string }): Promise<string | null>;
  function log(message: unknown, ...optionalParams: unknown[]): void;
  function delay(timeInMs: number): Promise<void>;
  function exit(message?: string | number | boolean | Date): never;

  // local & remote functions
  const local: ScriptContractV1_Local;
  const remote: ScriptContractV1_Remote;
}
