import { ipcMain, ipcRenderer } from "electron";
import { TypedIpcMain, TypedIpcRenderer } from "./ipc-intern";
import { RemoteFile } from "../models/RemoteFile";
import { RemoteTunnelDto } from "../models/RemoteTunnelDto";
import { RemoteDto } from "../models/RemoteDto";
import { FileText } from "../models/FileText";
import { SystemInfo } from "../models/SystemInfo";
import { CommandResult } from "../models/CommandResult";
import { ConnectResult } from "../models/ConnectResult";
import { UserGroup } from "../models/UserGroup";
import { RemoteInfo } from "../models/RemoteInfo";
import { RemoteTunnelInfo } from "../models/RemoteTunnelInfo";
import { RemoteShortcut } from "../models/RemoteShortcut";
import { TerminalSize } from "../models/TerminalSize";
import { RemoteShellDto } from "../models/RemoteShellDto";
import { ScriptInfo } from "../../main/models/Script";
import { ScriptExecutionResult } from "../../main/script-manager";
import { ScriptLog } from "../../renderer/models/ScriptList";

export type AppAction = 'openGithub' | 'openAppData' | 'openLog' | 'openAppConfig' | 'openRemotesConfig';

/** definitions of possible events that can occur on the main and can be listened to from the renderer */
type Events = {
  shellReceive: (id: string, shellId: string, data: string) => void;
  disposeRemote: (id: string) => void;
  disposeShell: (id: string, shellId: string) => void;
  scriptLog: (id: string, scriptId: string, scriptLog: ScriptLog) => void;
};

/** definition of possible commands that can be invoked on the main by the renderer */
type Commands = {
  getAppVersion: () => string;
  invokeAction: (action: AppAction) => Promise<void>;

  // remotes
  listRemotes: () => RemoteDto[];
  createRemote: () => RemoteDto;
  deleteRemote: (id: string) => void;
  updateRemote: (info: RemoteInfo) => void;

  // ssh certs
  getSshCertNames: () => string[];

  // connection
  connectRemote: (id: string) => ConnectResult;
  disconnectRemote: (id: string) => RemoteDto;

  // ssh
  executeSshCommand: (id: string, command: string) => CommandResult;
  getUsers: (id: string) => UserGroup[];
  getGroups: (id: string) => UserGroup[];
  getInfo: (id: string) => SystemInfo;

  // shell
  listShells: (id: string) => RemoteShellDto[];
  createShell: (id: string) => RemoteShellDto;
  destroyShell: (id: string, shellId: string) => void;
  sendShell: (id: string, shellId: string, text: string) => void;
  shellResize: (id: string, shellId: string, size: TerminalSize) => void;

  // sftp
  listDirectory: (id: string, path: string) => RemoteFile[];
  readText: (id: string, filePath: string) => FileText;
  writeText: (id: string, filePath: string, contents: string) => void;
  getFile: (id: string, path: string) => RemoteFile;

  delete: (id: string, path: string) => void;
  exists: (id: string, path: string) => boolean;
  rename: (id: string, oldPath: string, newPath: string) => void;

  changePermission: (id: string, path: string, chmod: number, recursive: boolean) => void;

  downloadFile: (id: string, filePath: string) => boolean;
  downloadFolderAsZip: (id: string, path: string) => boolean;

  pickFilePath: (title: string, buttonLabel: string, fileMustExists: boolean) => string | null;
  uploadFile: (id: string, localFilePath: string, remoteFilePath: string, overwrite: boolean) => void;

  // shortcuts
  createShortcut: (id: string, shortcut: RemoteShortcut) => RemoteShortcut[];
  removeShortcut: (id: string, shortcut: RemoteShortcut) => RemoteShortcut[];

  // tunnels
  listTunnels: (id: string) => RemoteTunnelDto[];
  createTunnel: (id: string, name: string) => RemoteTunnelDto[];
  removeTunnel: (id: string, tunnelId: string) => RemoteTunnelDto[];
  updateTunnel: (id: string, tunnel: RemoteTunnelInfo) => RemoteTunnelDto[];
  connectTunnel: (id: string, tunnelId: string) => RemoteTunnelDto[];
  disconnectTunnel: (id: string, tunnelId: string) => RemoteTunnelDto[];

  // shells
  listScripts: () => ScriptInfo[];
  createScript: (name: string) => ScriptInfo;
  deleteScript: (scriptId: string) => void;
  updateScript: (script: ScriptInfo) => ScriptInfo;
  executeScript: (id: string, scriptId: string) => ScriptExecutionResult;
};

export const typedIpcMain = ipcMain as TypedIpcMain<Events, Commands>;
export const typedIpcRenderer = ipcRenderer as TypedIpcRenderer<Events, Commands>;
