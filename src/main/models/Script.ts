
export interface Script {
    info: ScriptInfo;
}

export interface ScriptInfo {
    /** file path to the typescript file containing the script (e.G. '/var/Test Script/script.ts') */
    scriptFilePath: string;

    /** directory containing the script.ts (e.G. '/var/Test Script') */
    scriptDir: string;

    /** name of the script (the name of the folder the script is in) (e.G. 'Test Script') */
    name: string;

    /** normalized name for comparison */
    normalizedName: string;

    /** contents of the script */
    contents: string;
}