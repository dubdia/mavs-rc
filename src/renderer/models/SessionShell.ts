/** state of the react shell component */

import { TerminalSize } from "src/shared/models/TerminalSize";

export type SessionShell = {
    /** the complete shell history */
    data: string[];
};
