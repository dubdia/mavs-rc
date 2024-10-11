/** state of the react shell component */

import { TerminalSize } from "src/shared/models/TerminalSize";
import { TabName } from "./TabName";
import { ScriptInfo } from "../../main/models/Script";

export type SessionShell = {
    /** identifier of the tab */
    tab: TabName;

    /** id of the shell */
    shellId: string;

    /** the complete shell history */
    data: string[];
};
