import { TerminalSize } from "src/shared/models/TerminalSize";
import { PseudoTtyOptions, ClientChannel } from "ssh2";

/** contains the ssh shell state of a remote in main */
export interface RemoteShell {
  /** id of this shell to identiy it */
  shellId: string;
  /** the configuration that was used to create the shell */
  config: PseudoTtyOptions;
  /** the shell channel, holds the socket connection */
  channel: ClientChannel | null;
  /** the complete shell history of this shell session.
   * contains all data that the server sent to this client.
   * can be used to reconstruct the session in the xterm react component */
  history: string[];
}

