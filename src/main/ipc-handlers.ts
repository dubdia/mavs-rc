import { app, shell } from "electron";
import { typedIpcMain } from "../shared/ipc/ipc-api";
import { appConfigManager, remotesManager, scriptManager, sshCertManager, sshManager } from "./main";
import log from "electron-log/main";

/** registers the ipc handlers of main */
export function registerIpcHandlers() {
  // app
  typedIpcMain.handle("getAppVersion", () => {
    return app.getVersion();
  });
  typedIpcMain.handle("invokeAction", async (_, action) => {
    try {
      log.verbose("Handle app action", action);
      switch (action) {
        case "openAppData":
          await shell.openPath(app.getPath("userData"));
          break;
        case "openLog":
          await shell.showItemInFolder(app.getPath("logs"));
          break;
        case "openAppConfig":
          {
            const err = await shell.openPath(appConfigManager.configFilePath);
            if (err && err != "") {
              throw new Error(err);
            }
          }
          break;
        case "openRemotesConfig":
          {
            const err = await shell.openPath(remotesManager.config.configFilePath);
            if (err && err != "") {
              throw new Error(err);
            }
          }
          break;
        case "openGithub":
          await shell.openExternal("https://github.com/dubdia/mavs-rc");
          break;
        default:
          throw new Error("Unkown action");
      }
    } catch (err) {
      log.error("failed to execute action", action, err);
    }
  });

  // remotes
  typedIpcMain.handle("listRemotes", () => {
    return remotesManager.remotes.map((x) => remotesManager.map(x));
  });
  typedIpcMain.handle("createRemote", () => {
    return remotesManager.map(remotesManager.addNew());
  });
  typedIpcMain.handle("deleteRemote", async (_, id) => {
    return await remotesManager.deleteByIdAsync(id);
  });
  typedIpcMain.handle("updateRemote", (_, remoteInfo) => {
    return remotesManager.update(remoteInfo);
  });

  // ssh certs
  typedIpcMain.handle("getSshCertNames", () => {
    return sshCertManager.listSshCerts().map((x) => x.name);
  });

  // connection
  typedIpcMain.handle("connectRemote", async (_, id) => {
    return await sshManager.connectAsync(id);
  });
  typedIpcMain.handle("disconnectRemote", async (_, id) => {
    await sshManager.disconnectAsync(id);
    return remotesManager.map(remotesManager.findOrError(id));
  });

  // ssh
  typedIpcMain.handle("executeSshCommand", async (_, id, command) => {
    return await sshManager.executeCommand(id, command);
  });
  typedIpcMain.handle("getUsers", async (_, id) => {
    return await sshManager.getUsersOrGroupsAsync(id, "users");
  });
  typedIpcMain.handle("getGroups", async (_, id) => {
    return await sshManager.getUsersOrGroupsAsync(id, "groups");
  });
  typedIpcMain.handle("getInfo", async (_, id) => {
    return await sshManager.getInfoAsync(id);
  });

  // shell
  typedIpcMain.handle("listShells", (_, id) => {
    return sshManager.listShells(id);
  });
  typedIpcMain.handle("createShell", async (_, id, initialCommand) => {
    const shell = await sshManager.createShellAsync(id, initialCommand);
    return {
      shellId: shell.shellId,
      size: { rows: shell.config.rows, cols: shell.config.cols },
    };
  });
  typedIpcMain.handle("destroyShell", async (_, id, shellId) => {
    await sshManager.destroyShellAsync(id, shellId);
  });
  typedIpcMain.handle("sendShell", async (_, id, shellId, text) => {
    await sshManager.shellSendAsync(id, shellId, text);
  });
  typedIpcMain.handle("shellResize", (_, id, shellId, size) => {
    sshManager.shellResize(id, shellId, size);
  });

  // sftp
  typedIpcMain.handle("listDirectory", async (_, id, path) => {
    return await sshManager.listDirectoryAsync(id, path, false, true);
  });
  typedIpcMain.handle("readText", async (_, id, filePath) => {
    return await sshManager.readTextAsync(id, filePath, "utf8");
  });
  typedIpcMain.handle("writeText", async (_, id, filePath, contents) => {
    await sshManager.writeTextAsync(id, filePath, contents);
  });
  typedIpcMain.handle("getFile", async (_, id, path) => {
    return await sshManager.getFile(id, path);
  });

  typedIpcMain.handle("delete", async (_, id, path) => {
    await sshManager.deleteAsync(id, path);
  });
  typedIpcMain.handle("exists", async (_, id, path) => {
    return (await sshManager.existsAsync(id, path)) != null;
  });
  typedIpcMain.handle("rename", async (_, id, oldPath, newPath) => {
    return await sshManager.renameAsync(id, oldPath, newPath);
  });

  typedIpcMain.handle("changePermission", async (_, id, path, chmod: number, recursive: boolean) => {
    await sshManager.changePermissionAsync(id, path, chmod, recursive);
  });

  typedIpcMain.handle("downloadFile", async (_, id, filePath) => {
    return await sshManager.downloadFileAsync(id, filePath);
  });
  typedIpcMain.handle("downloadFolderAsZip", async (_, id, path) => {
    return await sshManager.downloadFolderAsync(id, path);
  });
  typedIpcMain.handle("pickFilePath", async (_, title, buttonLabel, fileMustExists) => {
    return await sshManager.pickFilePathAsync(title, buttonLabel, fileMustExists);
  });
  typedIpcMain.handle("uploadFile", async (_, id, localFilePath, remoteFilePath, overwrite) => {
    await sshManager.uploadFileAsync(id, localFilePath, remoteFilePath, overwrite);
  });

  // shortcuts
  typedIpcMain.handle("createShortcut", (_, id, shortcut) => {
    remotesManager.addShortcut(id, shortcut);
    return remotesManager.findOrError(id).info.shortcuts;
  });
  typedIpcMain.handle("removeShortcut", async (_, id, shortcut) => {
    remotesManager.removeShortcut(id, shortcut);
    return remotesManager.findOrError(id).info.shortcuts;
  });

  // tunnels
  typedIpcMain.handle("listTunnels", (_, id) => {
    return sshManager.listTunnels(id);
  });
  typedIpcMain.handle("createTunnel", (_, id, name) => {
    sshManager.createTunnel(id, name);
    return sshManager.listTunnels(id);
  });
  typedIpcMain.handle("removeTunnel", async (_, id, tunnelId) => {
    await sshManager.removeTunnelAsync(id, tunnelId);
    return sshManager.listTunnels(id);
  });
  typedIpcMain.handle("updateTunnel", (_, id, tunnel) => {
    sshManager.updateTunnel(id, tunnel);
    return sshManager.listTunnels(id);
  });
  typedIpcMain.handle("connectTunnel", async (_, id, tunnelId) => {
    await sshManager.connectTunnelAsync(id, tunnelId);
    return sshManager.listTunnels(id);
  });
  typedIpcMain.handle("disconnectTunnel", async (_, id, tunnelId) => {
    await sshManager.disconnectTunnelAsync(id, tunnelId);
    return sshManager.listTunnels(id);
  });

  // scripts
  typedIpcMain.handle("listScripts", (_) => {
    return scriptManager.listScripts({ withContents: true });
  });
  typedIpcMain.handle("createScript", (_, name) => {
    return scriptManager.addNew(name);
  });
  typedIpcMain.handle("deleteScript", async (_, name) => {
    scriptManager.delete(name);
  });
  typedIpcMain.handle("updateScript", (_, name, contents) => {
    return scriptManager.update(name, contents);
  });
  typedIpcMain.handle("executeScript", async (_, id, name) => {
    return await scriptManager.executeAsync(id, name);
  });
}
