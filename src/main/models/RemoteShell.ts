import { TerminalSize } from "src/shared/models/TerminalSize";
import { PseudoTtyOptions, ClientChannel } from "ssh2";

/** contains the ssh shell state of a remote in main */

export interface RemoteShell {
  config: PseudoTtyOptions;
  channel: ClientChannel;
  history: string[];
}

