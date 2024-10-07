/** state of the react shell component */

import { TerminalSize } from "src/shared/models/TerminalSize";
import { TabName } from "./TabName";

export type SessionShell = {
    /** identifier of the tab */
    tab: TabName;

    /** id of the shell */
    shellId: string;

    /** the complete shell history */
    data: string[];
};
