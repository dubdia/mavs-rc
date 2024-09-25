import { RemoteShortcut } from "../../shared/models/RemoteShortcut";

/** state of remote shortcuts */

export type SessionShortcuts = {
    /** whether the shortcuts are loading */
    loading: boolean;

    /** list of all shortcuts */
    shortcuts: RemoteShortcut[];
};
