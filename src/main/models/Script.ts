
export interface Script {
    info: ScriptInfo;
    running: boolean;
}

export interface ScriptInfo {
    /** id of this script to identify it */
    scriptId: string;
    /** name of the script */
    name: string;
    /** typescript content of the script */
    content: string;
}