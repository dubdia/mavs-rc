import { OsType } from "../../shared/models/OsType";
import { UserGroup } from "../../shared/models/UserGroup";
import { SSH2Promise } from "../ssh2-promise/src";
import { SFTP } from "../ssh2-promise/src/sftp";
import { RemoteTunnel } from "./RemoteTunnel";
import { RemoteShell } from "./RemoteShell";

/** contains the ssh connection state of a remote in main */

export interface RemoteConnection {
  ssh: SSH2Promise;
  sftp: SFTP;
  shells: RemoteShell[];
  tunnels: RemoteTunnel[];
  osType: OsType;
  users: UserGroup[];
  groups: UserGroup[];
  disposed: boolean;
}
