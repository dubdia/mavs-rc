import { Server } from "ssh2";
import { TunnelConfig } from "../ssh2-promise/src/tunnelConfig";

/** contains the ssh tunnel state of a remote in main */

export interface RemoteTunnel {
  tunnelId: string;
  connection: TunnelConfig & { server: Server; };
}
