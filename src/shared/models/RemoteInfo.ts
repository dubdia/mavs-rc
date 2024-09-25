import { RemoteTunnelInfo } from "./RemoteTunnelInfo";
import { RemoteShortcut } from "./RemoteShortcut";

/** represents a remote - this information is stored in the configuration file */
export interface RemoteInfo {
  revision: number;
  id: string;
  name: string;
  description: string;
  host: string;
  port: number;
  user: string;
  usePasswordAuth: boolean;
  password: string;
  storePassword: boolean;
  usePrivateKeyAuth: boolean;
  privateKeySource: "text" | "file";
  privateKey: string;
  storePrivateKey: boolean;
  privateKeyFileName: string;
  passphrase: string;
  storePassphrase: boolean;
  shortcuts: RemoteShortcut[];
  tunnels: RemoteTunnelInfo[];
}
