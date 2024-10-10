declare type ScriptContractV1_Shared = {
    mkDir(path: string, {ignoreErrors} : {ignoreErrors?: boolean}): Promise<void>;
    rmDir(path: string, {ignoreErrors} : {ignoreErrors?: boolean}): Promise<void>;
    listDir(path: string, {recursive} : {recursive?: boolean}): Promise<string[]>;
    dirExists(filePath: string, {ignoreErrors} : {ignoreErrors?: boolean}): Promise<boolean>;
    
    writeFileText(filePath: string, contents: string, {ignoreErrors} : {ignoreErrors?: boolean} ): Promise<void>;
    readFileText(filePath: string, {ignoreErrors} : {ignoreErrors?: boolean} ): Promise<string>;
    readFileBuffer(filePath: string, {ignoreErrors} : {ignoreErrors?: boolean} ): Promise<Buffer>;
    deleteFile(filePath: string, {ignoreErrors} : {ignoreErrors?: boolean} ): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
   
    exec(command: string, {ignoreErrors} : {ignoreErrors?: boolean} ): Promise<{stdout: string, stderr: string}>;
}
declare type ScriptContractV1_Remote = ScriptContractV1_Shared & {
}
declare type ScriptContractV1_Local = ScriptContractV1_Shared & {
}
declare type ScriptContractV1_Basis = {
    alert(message: string) : void;
    confirm(message: string): boolean;
    log(message: any, ...optionalParams:any[]): void;
}

declare namespace ScriptContractV1 { //global
    // constants
    const remoteId: string;
    const remoteName: string;

    // generic functions
    function alert(message: string): void;
    function confirm(message: string): boolean;
    function log(message: any, ...optionalParams:any[]): void;

    // local & remote functions
    const local: ScriptContractV1_Local;
    const remote: ScriptContractV1_Remote;
}
