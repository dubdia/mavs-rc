import { RemoteShortcutType } from "./RemoteShortcutType";

/** represents a shortcut */
export interface RemoteShortcut {
  type: RemoteShortcutType;
  name: string;
  value: string;
}

