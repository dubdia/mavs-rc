import log from "electron-log/main";

import { v4 } from "uuid";
import { RemoteDto } from "../shared/models/RemoteDto";
import { OsType } from "../shared/models/OsType";
import { RemoteInfo } from "../shared/models/RemoteInfo";
import { Remote } from "./models/Remote";
import { mainWindow } from "./main";
import { RemoteShortcut } from "../shared/models/RemoteShortcut";
import { RemotesConfigManager } from "./config/remotes-config-manager";
import { RemoteTunnel } from "./models/RemoteTunnel";
import { SSHConnection } from "./ssh2-promise/src/sshConnection";
import { RemoteConnection } from "./models/RemoteConnection";
import { RemoteShell } from "./models/RemoteShell";

/** used to manage remotes  */
export class RemotesManager {
  public remotes: Remote[];
  public config = new RemotesConfigManager();

  constructor() {
    // load remotes from config
    this.remotes = this.config.config.remoteInfos
      .filter((x) => x != null && x.id != null && x.id != "")
      .map((x) => {
        return <Remote>{
          info: x,
        };
      });
    log.info(`Loaded ${this.remotes.length} remotes from config`);
  }

  private updateConfig() {
    // update and save config
    log.verbose("Update config");
    this.config.config.remoteInfos = this.remotes
      .filter((x) => x?.info?.id != null)
      .map((x) => {
        // clone info and normalize it
        const clonedInfo = this.cloneRemoteInfo(x.info);
        this.normalizeRemoteInfo(clonedInfo);

        // remove sensetive information before saving
        if (!clonedInfo.storePassphrase) {
          clonedInfo.passphrase = "";
        }
        if (!clonedInfo.storePassword) {
          clonedInfo.password = "";
        }
        if (!clonedInfo.storePrivateKey) {
          clonedInfo.privateKey = "";
        }
        return clonedInfo;
      });
    this.config.saveConfig();
  }

  // GET REMOTES
  public findOrError(id: string, { mustBeConnected }: { mustBeConnected?: boolean } = {}): Remote {
    if (id == null || id == "") {
      throw new Error(`Could not find remote with empty id`);
    }
    const element = this.remotes.find((x) => x.info.id == id);
    if (element == null) {
      throw new Error(`Could not find remote with id ${id}`);
    } else if (mustBeConnected == true && !this.isConnected(element)) {
      throw new Error(`Remote with id ${id} is not connected`);
    }
    return element;
  }

  public isConnected(remote: Remote): boolean {
    return remote.connection != null && remote.connection.ssh != null && remote.connection.sftp != null;
  }
  public map(remote: Remote): RemoteDto {
    const connected = this.isConnected(remote);
    const newRemote: RemoteDto = {
      info: remote.info,
      connected: connected,
      osType: remote.connection?.osType ?? OsType.Unknown,
    };
    return newRemote;
  }

  public addNew(): Remote {
    const newRemote = <Remote>{
      info: {
        description: "",
        id: v4(),
        name: `Remote #${this.remotes.length + 1}`,
      },
    };
    this.remotes.unshift(newRemote);
    this.updateConfig();
    log.info(`Added new Remote: ${newRemote.info.name}`);
    return newRemote;
  }

  public async deleteByIdAsync(id: string) {
    const remote = this.findOrError(id);
    await this.deleteAsync(remote);
  }
  public async deleteAsync(remote: Remote) {
    if (remote == null) {
      return;
    }
    this.disposeRemoteAsync(remote);
    this.remotes = this.remotes.filter((x) => x != remote);
    this.updateConfig();
  }

  public async disposeAsync() {
    if (this.remotes) {
      for (let remote of this.remotes) {
        await this.disposeRemoteAsync(remote);
      }
    }
  }

  public async disposeRemoteAsync(remote: Remote) {
    // check
    if (remote == null) {
      return;
    }
    const connection = remote.connection;
    if (connection == null) {
      return;
    }
    if (connection.disposed) {
      log.verbose("Tried to dispose connection but it is already disposed. But tell client anyway");
      try {
        if (remote.info?.id) {
          mainWindow.webContents.send("disposeRemote", remote.info.id);
        }
      } catch (err) {
        log.warn(`Failed to tell client about remote dispose`, err);
      }
      return;
    }
    log.info("Dispose connection");
    connection.disposed = true;

    // dispose tunnels
    try {
      if (connection.tunnels) {
        const tunnels = [...connection.tunnels];
        for (let tunnel of tunnels) {
          try {
            await this.disposeTunnelAsync(tunnel, connection);
          } catch (err) {
            log.warn(`Failed to dispose tunnel`, err);
          }
        }
      }
    } catch (err) {
      log.warn(`Failed to dispose tunnels`, err);
    }

    // dispose shell
    try {
      if (connection.shells) {
        const shells = [...connection.shells];
        for (let shell of shells) {
          try {
            await this.disposeShellAsync(shell, remote);
          } catch (err) {
            log.warn(`Failed to dispose shell`, err);
          }
        }
      }
    } catch (err) {
      log.warn(`Failed to dispose shells`, err);
    }

    // dispose sftp
    try {
      connection.sftp?.removeAllListeners();
      connection.sftp = null;
    } catch (err) {
      log.warn(`Failed to dispose sftp`, err);
    }

    // dispose ssh
    try {
      connection.ssh?.removeAllListeners();
      await connection.ssh?.close();
      connection.ssh = null;
    } catch (err) {
      log.warn(`Failed to dispose ssh`, err);
    }

    // tell client
    try {
      if (remote.info?.id) {
        mainWindow.webContents.send("disposeRemote", remote.info.id);
      }
    } catch (err) {
      log.warn(`Failed to tell client about remote dispose`, err);
    }

    log.info("Disposed connection");
  }

  public async disposeTunnelAsync(tunnel: RemoteTunnel, connection: RemoteConnection) {
    if (tunnel == null) {
      return;
    }

    // close via SSH2Promise
    if (tunnel.tunnelId && connection?.ssh) {
      await connection.ssh.closeTunnel(tunnel?.tunnelId);
    }

    // if still open, we
    if (tunnel?.connection?.server) {
      try {
        // remove all listeners
        tunnel.connection.server.removeAllListeners();

        // close and wait for it
        await new Promise((resolve, reject) => {
          tunnel.connection.server.close((err: Error | null) => {
            if (err) {
              reject(err);
            } else {
              resolve(null);
            }
          });
        });
      } catch (err) {
        log.error("Failed to close tunnel", err);
      }
      tunnel.connection = null;
    }

    // remove from our connections
    connection.tunnels = connection.tunnels.filter((x) => x.tunnelId !== tunnel.tunnelId);
  }
  public async disposeShellAsync(shell: RemoteShell, remote: Remote) {
    if (shell == null) {
      return;
    }

    // dispose
    if (shell.channel) {
      shell.channel.removeAllListeners();
      shell.channel.close();
      shell.channel.destroy();
      shell.channel = null;
    }

    // remove from our connections
    remote.connection.shells = remote.connection.shells.filter((x) => x.shellId !== shell.shellId);

    // tell client
    try {
      mainWindow.webContents.send("disposeShell", remote.info.id, shell.shellId);
    } catch (err) {
      log.warn(`Failed to tell client about shell dispose`, err);
    }
  }

  public update(remoteInfo: RemoteInfo) {
    // check
    if (remoteInfo == null || remoteInfo.id == null) {
      throw new Error("no or invalid remote info given");
    }

    // find by id and update
    const remote = this.findOrError(remoteInfo.id);
    remote.info = remoteInfo;
    remote.info.revision++;

    // save config
    this.updateConfig();
  }

  private normalizeRemoteInfo(remoteInfo: RemoteInfo) {
    remoteInfo.name = remoteInfo.name?.trim() ?? "";
    remoteInfo.description = remoteInfo?.description?.trim() ?? "";
    remoteInfo.host = remoteInfo.host ?? "";
    remoteInfo.user = remoteInfo.user ?? "";
    remoteInfo.shortcuts = remoteInfo.shortcuts ?? [];
    remoteInfo.tunnels = remoteInfo.tunnels ?? [];
  }

  private cloneRemoteInfo(remoteInfo: RemoteInfo) {
    const cloned = {} as RemoteInfo;
    cloned.revision = remoteInfo.revision;
    cloned.id = remoteInfo.id;
    cloned.name = remoteInfo.name;
    cloned.description = remoteInfo.description;
    cloned.host = remoteInfo.host;
    cloned.port = remoteInfo.port;
    cloned.user = remoteInfo.user;
    cloned.usePasswordAuth = remoteInfo.usePasswordAuth;
    cloned.password = remoteInfo.password;
    cloned.storePassword = remoteInfo.storePassword;
    cloned.usePrivateKeyAuth = remoteInfo.usePrivateKeyAuth;
    cloned.privateKeySource = remoteInfo.privateKeySource;
    cloned.privateKey = remoteInfo.privateKey;
    cloned.storePrivateKey = remoteInfo.storePrivateKey;
    cloned.privateKeyFileName = remoteInfo.privateKeyFileName;
    cloned.passphrase = remoteInfo.passphrase;
    cloned.storePassphrase = remoteInfo.storePassphrase;
    cloned.shortcuts = [...(remoteInfo.shortcuts ?? [])];
    cloned.tunnels = [...(remoteInfo.tunnels ?? [])];
    return cloned;
  }

  public addShortcut(id: string, shortcut: RemoteShortcut) {
    const remote = this.findOrError(id);
    if (shortcut == null || shortcut.name == null || shortcut.type == null) {
      throw new Error("Cannot add null");
    }
    if (remote.info.shortcuts == null) {
      remote.info.shortcuts = [];
    }
    remote.info.shortcuts.push(shortcut);
    this.updateConfig();
  }
  public removeShortcut(id: string, shortcut: RemoteShortcut) {
    const remote = this.findOrError(id);
    if (remote.info.shortcuts == null) {
      remote.info.shortcuts = [];
    }
    remote.info.shortcuts = remote.info.shortcuts.filter((x) => !this.isShortcutEqual(x, shortcut));
    this.updateConfig();
  }

  private isShortcutEqual(a: RemoteShortcut, b: RemoteShortcut) {
    if (a === b) {
      return true;
    } else if (a == null && b == null) {
      return true;
    } else if ((a.name ?? "") != (b.name ?? "")) {
      return false;
    } else if ((a.type?.toLocaleLowerCase() ?? "") != (b.type?.toLocaleLowerCase() ?? "")) {
      return false;
    } else if ((a.value ?? "") != (b.value ?? "")) {
      return false;
    }

    return true;
  }
}
