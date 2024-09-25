import { RemotesManager } from "./remotes-manager";
import { RemoteFile } from "../shared/models/RemoteFile";
import { RemoteTunnelDto } from "../shared/models/RemoteTunnelDto";
import { FileText } from "../shared/models/FileText";
import { SystemInfo } from "../shared/models/SystemInfo";
import { CommandResult } from "../shared/models/CommandResult";
import { ConnectResult } from "../shared/models/ConnectResult";
import { UserGroup } from "../shared/models/UserGroup";
import { OsType } from "../shared/models/OsType";
import { FileEntryWithStats, Server, Stats } from "ssh2";
import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import log from "electron-log/main";
import { Remote } from "./models/Remote";
import { RemoteConnection } from "./models/RemoteConnection";

import { joinPath } from "../shared/utils/io/joinPath";
import { escapeUnixShellArg } from "../shared/utils/escapeUnixShellArg";
import { dialog } from "electron";
import { mainWindow } from "./main";
import { RemoteTunnelInfo } from "../shared/models/RemoteTunnelInfo";
import { SSHConfig } from "./ssh2-promise/src/sshConfig";
import { TunnelConfig } from "./ssh2-promise/src/tunnelConfig";
import { v4 } from "uuid";
import { SSH2Promise } from "./ssh2-promise/src";

/** used to do everyting related to ssh and sftp */
export class SshManager {
  constructor(private remotesManager: RemotesManager) {}

  public listSshCerts(): SshCert[] {
    // for now the ssh path is fixed //Todo
    const sshDir = path.join(app.getPath("home"), ".ssh");
    const sshDirExists = fs.existsSync(sshDir);
    if (!sshDirExists) {
      log.warn(`Could not find Users .ssh directory: ${sshDir}`);
      return [];
    }

    // read directory
    const fileNames = fs.readdirSync(sshDir);
    const certs: SshCert[] = [];
    for (let fileName of fileNames) {
      // check file name
      if (fileName == null || fileName == "" || fileName.startsWith(".")) {
        continue; // must have valid name
      }
      if (fileName.endsWith(".ppk")) {
        continue; // must not be public key
      }

      // build path
      const filePath = path.join(sshDir, fileName);

      // check stats
      const fileStats = fs.statSync(filePath);
      if (fileStats.isDirectory() || !fileStats.isFile()) {
        continue; // must be a file
      }
      if (fileStats.size <= 0 || fileStats.size > 1024 * 32) {
        continue; // certs are not that big
      }

      // add
      certs.push({
        name: fileName,
        filePath: filePath,
      });
    }
    log.debug(`Found ${certs.length} ssh certificates in ${sshDir}`);
    return certs;
  }
  public getSshCertContent(certName: string): string {
    // check name
    if (certName == null || certName == "") {
      throw new Error("No cert name was given");
    }

    // find file path
    const certs = this.listSshCerts();
    const cert = certs.find((x) => x.name == certName);
    if (cert == null) {
      throw new Error("Could not find cert by name: " + certName);
    }

    // read it
    if (!fs.existsSync(cert.filePath)) {
      throw new Error("Could not find cert file for: " + cert.filePath);
    }
    const buffer = fs.readFileSync(cert.filePath);
    const contents = buffer.toString();

    log.info(`Read Ssh certificate file: ${cert.filePath} (${buffer.length} bytes)`);
    return contents;
  }
  public getSshCertFilePath(certName: string): string {
    // check name
    if (certName == null || certName == "") {
      throw new Error("No cert name was given");
    }

    // find file path
    const certs = this.listSshCerts();
    const cert = certs.find((x) => x.name == certName);
    if (cert == null) {
      throw new Error("Could not find cert by name: " + certName);
    }

    // check it
    if (!fs.existsSync(cert.filePath)) {
      throw new Error("Could not find cert file for: " + cert.filePath);
    }

    return cert.filePath;
  }

  public async connectAsync(id: string): Promise<ConnectResult> {
    // disconnet/cleanup remote
    await this.disconnectAsync(id);
    const remote = this.remotesManager.findOrError(id);

    // prepare
    let connection: RemoteConnection = {
      ssh: null,
      sftp: null,
      osType: OsType.Unknown,
      groups: [],
      users: [],
      shell: null,
      tunnels: [],
      disposed: false,
    };
    try {
      // build connection info
      const connectionInfo: SSHConfig = {
        host: remote.info.host,
        port: remote.info.port,
        username: remote.info.user,
        tryKeyboard: true,
        //keepaliveInterval: 2000,
        //keepaliveCountMax: 10,    // 20 second after disconnect
        debug: (message) => log.debug("ssh: " + message),
      };

      // configure password auth
      if (remote.info.usePasswordAuth && remote.info.password) {
        connectionInfo.password = remote.info.password ?? "";
      }

      // configure publickey auth
      if (remote.info.usePrivateKeyAuth) {
        if (remote.info.privateKeySource == "text" && remote.info.privateKey) {
          connectionInfo.privateKey = remote.info.privateKey;
        } else if (remote.info.privateKeySource == "file" && remote.info.privateKeyFileName) {
          const sshCertContents = this.getSshCertContent(remote.info.privateKeyFileName);
          connectionInfo.privateKey = sshCertContents;
        }
        if (remote.info.passphrase) {
          connectionInfo.passphrase = remote.info.passphrase;
        }
      }

      // configure special case (password auth + publickey auth) //see: https://github.com/mscdex/ssh2/issues/1187
      if (remote.info.usePasswordAuth && remote.info.usePrivateKeyAuth) {
        let sentPublicKey = false;
        let sentPassword = false;
        connectionInfo.authHandler = (curAuthsLeft, curPartial, doNextAuth) => {
          if (!sentPublicKey) {
            sentPublicKey = true;
            return "publickey";
          }

          if (!sentPassword) {
            sentPassword = true;
            return "password";
          }
          return false;
        };
      }

      // create ssh and register on events
      connection.ssh = new SSH2Promise(connectionInfo);
      connection.ssh.on("ssh", (eventName: string) => {
        // possible values: "beforeconnect", "connect", "beforedisconnect", "disconnect"
        log.debug(`Received ssh event ${eventName}`);
        if (eventName == "disconnect" && !connection.disposed) {
          log.info(`Connection exited, dispose remote now`);
          this.remotesManager.disposeRemoteAsync(remote).then();
        }
      });

      // connect to ssh/sftp
      await connection.ssh.connect();
      connection.sftp = connection.ssh.sftp();

      // detect architecture
      connection.osType = await this.detectPosixWindowsAsync(connection.ssh);

      // get users and groups
      connection.users = await this.getUsersOrGroupsInternalAsync(connection, "users");
      connection.groups = await this.getUsersOrGroupsInternalAsync(connection, "groups");

      // setup shell
      connection.shell = {
        config: {
          term: "xterm",
          cols: 80,
          rows: 24,
          width: 80 * 10,
          height: 24 * 10,
        },
        history: [],
        channel: null,
      };
      connection.shell.channel = await connection.ssh.shell(connection.shell.config);
      connection.shell.channel.on("exit", (code: number | null, signal?: string, dump?: string, desc?: string) => {
        // check if remote is disposing or disposed
        if (connection.disposed) {
          return;
        }

        // if the shell closes, we close the whole connection
        log.info(`Shell exited with code ${code}, dispose remote now`);
        this.remotesManager.disposeRemoteAsync(remote).then();
      });
      connection.shell.channel.on("data", (data: Buffer) => {
        // check if remote is disposing or disposed
        if (connection.disposed) {
          return;
        }

        // get text
        const text = data?.toString();
        if (text == null || text == "") {
          return;
        }

        // store in shell history
        log.debug("Shell STDOUT", text);
        connection.shell.history.push(text);

        mainWindow.webContents.send("shellReceive", id, text);
      });
      connection.shell.channel.stderr.on("data", (data: Buffer) => {
        // check if remote is disposing or disposed
        if (connection.disposed) {
          return;
        }

        // get text
        const text = data?.toString();
        if (text == null || text == "") {
          return;
        }

        // store in shell history
        log.debug("Shell STDERR", text);
        connection.shell.history.push(text);

        mainWindow.webContents.send("shellReceive", id, text);
      });

      // try to activate the tunnels
      if (remote.info.tunnels) {
        const tunnelsToStart = remote.info.tunnels.filter(
          (x) => x && this.canStartTunnel(x) && x.autoConnectOnLogin == true
        );
        for (let tunnel of tunnelsToStart) {
          try {
            await this.connectTunnelInternalAsync(connection, tunnel);
          } catch (err) {
            log.warn(`Failed to start tunnel: ${tunnel.name}`, err);
          }
        }
      }

      // set connection to remote
      remote.connection = connection;

      // return success
      log.info(
        `Successfully connected to ssh ${remote.info.host}:${remote.info.port}. OS: ${
          connection.osType ?? OsType.Unknown
        }`
      );
      return {
        success: true,
        remote: this.remotesManager.map(this.remotesManager.findOrError(id)),
      };
    } catch (err) {
      // failed to connect, cleanup
      log.info(`Failed to conntect to remote: ${remote.info.id}`, err);

      try {
        await this.remotesManager.disposeRemoteAsync({
          connection: connection,
          info: remote.info,
        });
      } catch (err) {
        log.error(`Failed to cleanup after failed connection attempt to remote: ${remote.info.id}`, err, connection);
      }

      // get error message
      let errorMessage = "An error occured while connecting";
      if (err.message) {
        errorMessage = err.message;
      }

      // read dto
      const dto = this.remotesManager.map(this.remotesManager.findOrError(remote.info.id));

      // return error
      return {
        success: false,
        error: errorMessage,
        remote: dto,
      };
    }
  }

  public async disconnectAsync(id: string) {
    const remote = this.remotesManager.findOrError(id);
    await this.remotesManager.disposeRemoteAsync(remote);
  }

  public async detectPosixWindowsAsync(ssh: SSH2Promise): Promise<OsType> {
    // check for posix
    try {
      const result: string = await ssh.exec("uname -a");
      if (result != null && result.toLowerCase().indexOf("linux") >= 0) {
        return OsType.Posix;
      }
    } catch {}

    // check for windows
    try {
      const result: string = await ssh.exec("ver");
      if (result != null && result.toLowerCase().indexOf("windows") >= 0) {
        return OsType.Windows;
      }
    } catch {}

    // unknown
    return OsType.Unknown;
  }

  public async executeCommand(id: string, command: string): Promise<CommandResult> {
    log.debug(`Execute command: ${command}`);
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    try {
      const result = await connection.ssh.exec(command);
      log.debug(` > ${result}`);
      return {
        output: result,
        success: true,
      };
    } catch (err) {
      log.debug(` > command failed: ${err}`);
      if (err && typeof err === "string" && err != "") {
        // the command failed
        return {
          output: err,
          success: false,
        };
      } else {
        throw err;
      }
    }
  }

  public async listDirectoryAsync(id: string, path: string, recursive: boolean): Promise<RemoteFile[]> {
    log.debug(`List directory ${path}...`);
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return await this.listDirectoryInternalAsync(remote, path, recursive);
  }
  public async listDirectoryInternalAsync(remote: Remote, path: string, recursive: boolean): Promise<RemoteFile[]> {
    // read everything in this directory and map it
    const result = await remote.connection.sftp.readdir(path);
    const files: RemoteFile[] = result.map((x: FileEntryWithStats) => {
      const fullPath = joinPath([path, x.filename], remote.connection.osType);
      return this.mapFile(x.attrs, fullPath, remote);
    });

    // recursive?
    if (recursive) {
      for (let file of files) {
        // check if normal directory
        if (file == null || !file.isDirectory) {
          continue;
        }
        if (
          file.name == null ||
          file.name == "" ||
          file.name == "." ||
          file.name == ".." ||
          file.name == "/" ||
          file.name == "\\"
        ) {
          continue;
        }
        if (file.fullName == null || file.fullName == "" || file.fullName == path) {
          continue;
        }

        // add contents of it too
        const contentsOfSubDir = await this.listDirectoryInternalAsync(remote, file.fullName, true);
        files.push(...contentsOfSubDir);
      }
    }

    return files;
  }

  public async getFile(id: string, path: string): Promise<RemoteFile> {
    log.debug(`Get file ${path}...`);
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    const connection = remote.connection;
    const result = await connection.sftp.stat(path);
    const file = this.mapFile(result, path, remote);
    return file;
  }

  public mapFile(stats: Stats, fullName: string, remote: Remote): RemoteFile {
    // create remote file from given stats
    const remoteFile = <RemoteFile>{
      fullName: fullName, // joinPath([dir, file.filename], remote.connection?.osType),
      name: path.basename(fullName),
    };

    // map all attributes of the file
    this.mapAttributes(stats, remoteFile, remote?.connection);
    return remoteFile;
  }
  public mapAttributes(attributes: Stats, file: RemoteFile, connection: RemoteConnection) {
    file.length = attributes.size;
    file.userId = attributes.uid;
    file.groupId = attributes.gid;
    file.lastAccessTime = new Date(attributes.atime * 1000).getDate();
    file.lastWriteTime = new Date(attributes.mtime * 1000).getDate();
    file.isSocket = (attributes.mode & 0o140000) === 0o140000;
    file.isSymbolicLink = (attributes.mode & 0o120000) === 0o120000;
    file.isRegularFile = (attributes.mode & 0o100000) === 0o100000;
    file.isBlockDevice = (attributes.mode & 0o060000) === 0o060000;
    file.isDirectory = (attributes.mode & 0o040000) === 0o040000;
    file.isCharacterDevice = (attributes.mode & 0o020000) === 0o020000;
    file.isNamedPipe = (attributes.mode & 0o010000) === 0o010000;
    file.ownerCanRead = !!(attributes.mode & 0o400);
    file.ownerCanWrite = !!(attributes.mode & 0o200);
    file.ownerCanExecute = !!(attributes.mode & 0o100);
    file.groupCanRead = !!(attributes.mode & 0o040);
    file.groupCanWrite = !!(attributes.mode & 0o020);
    file.groupCanExecute = !!(attributes.mode & 0o010);
    file.othersCanRead = !!(attributes.mode & 0o004);
    file.othersCanWrite = !!(attributes.mode & 0o002);
    file.othersCanExecute = !!(attributes.mode & 0o001);

    if (connection != null) {
      if (connection.users != null && file.userId != null) {
        file.userName = connection.users.find((x) => x.id == file.userId)?.name;
      }
      if (connection.groups != null && file.groupId != null) {
        file.groupName = connection.groups.find((x) => x.id == file.groupId)?.name;
      }
    }
  }

  public async readTextAsync(id: string, filePath: string, encoding: BufferEncoding): Promise<FileText> {
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    return await this.readTextInternalAsync(connection, filePath, encoding);
  }
  public async readTextInternalAsync(
    connection: RemoteConnection,
    filePath: string,
    encoding: BufferEncoding
  ): Promise<FileText> {
    log.debug(`Read file ${filePath} using encoding ${encoding}...`);
    const text = await connection.sftp.readFile(filePath, encoding);
    log.debug(` > got ${text.length} chars`);
    return {
      filePath: filePath,
      contents: text,
    };
  }

  public async shellSendAsync(id: string, text: string) {
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    return await this.shellSendInternalAsync(connection, text);
  }
  public async shellSendInternalAsync(connection: RemoteConnection, text: string) {
    log.debug(`Send text to shell: ${text}`);
    return await new Promise((resolve, reject) => {
      connection.shell.channel.write(text, undefined, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        }
      });
    });
  }

  public async writeTextAsync(id: string, filePath: string, contents: string): Promise<void> {
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    await this.writeTextInternalAsync(connection, filePath, contents);
  }
  public async writeTextInternalAsync(connection: RemoteConnection, filePath: string, contents: string): Promise<void> {
    log.debug(`Write file ${contents?.length ?? 0} chars to ${filePath} `);
    await connection.sftp.writeFile(filePath, contents ?? "", {});
  }

  public async deleteAsync(id: string, path: string): Promise<void> {
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    await this.deleteInternalAsync(connection, path);
  }
  public async deleteInternalAsync(connection: RemoteConnection, path: string): Promise<void> {
    if (path == null || path == "" || path == "/" || path == "\\" || path == "." || path == "..") {
      throw new Error("Safety-Check: Unable to delete this path");
    }
    log.debug(`Delete ${path}...`);
    const dirArg = escapeUnixShellArg(path);
    await connection.ssh.exec("rm -rf " + dirArg);

    /* try {
      // get stats to check file or folder
      const stats = await connection.sftp.stat(path);
      if (stats) {
        if (stats.isFile()) {
          // delete file
          log.debug(` > delete the file`);
          await connection.sftp.unlink(path);
        } else if (stats.isDirectory()) {
          // delete folder
          log.debug(` > delete the directory`);
          await connection.sftp.rmdir(path);
        } else {
          throw new Error("It is only possible to delete files or folders");
        }
      } else {
        throw new Error("No stats and no error");
      }
    } catch (err: any) {
      if (err && (err.code === "ENOENT" || err.code == 2)) {
        // file or folder does not exists
      } else {
        throw err;
      }
    }
      */
  }

  public async renameAsync(id: string, oldPath: string, newPath: string): Promise<void> {
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    await this.renameInternalAsync(connection, oldPath, newPath);
  }
  public async renameInternalAsync(connection: RemoteConnection, oldPath: string, newPath: string): Promise<void> {
    if (oldPath == null || oldPath == newPath) {
      return;
    }
    log.debug(`Rename ${oldPath} to  ${newPath}...`);
    await connection.sftp.rename(oldPath, newPath);
  }

  public async existsAsync(id: string, filePath: string) {
    const connection = this.remotesManager.findOrError(id, { mustBeConnected: true }).connection;
    return await this.existsInternalAsync(connection, filePath);
  }
  public async existsInternalAsync(connection: RemoteConnection, filePath: string) {
    try {
      const stats = await connection.sftp.stat(filePath);
      if (stats) {
        return true;
      } else {
        throw new Error("No stats and no error");
      }
    } catch (err: any) {
      if (err && (err.code === "ENOENT" || err.code == 2)) {
        return false;
      } else {
        throw err;
      }
    }
  }

  public async changePermissionAsync(id: string, path: string, chmod: number, recursive: boolean) {
    log.debug(`Change permission of ${path} to ${chmod} ${recursive ? "recursive" : ""}...`);
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return await this.changePermissionInternalAsync(remote, path, chmod, recursive);
  }
  public async changePermissionInternalAsync(remote: Remote, path: string, chmod: number, recursive: boolean) {
    // check
    if (path == null || path == "" || path == "/" || path == "\\") {
      throw new Error("Path not valid");
    } else if (chmod == null) {
      throw new Error("chmod not valid");
    }

    // convert to octal for this
    const mode = parseInt(chmod.toString(), 8); ///777 => 0o777

    // change for this
    await remote.connection.sftp.chmod(path, mode);

    // recursive?
    if (recursive) {
      const stat = await remote.connection.sftp.stat(path);
      if (stat.isDirectory()) {
        // get everything inside of this directory
        const files = await this.listDirectoryInternalAsync(remote, path, true);
        for (let file of files) {
          // check
          await remote.connection.sftp.chmod(file.fullName, mode);
        }
      }
    }
  }

  public async getInfoAsync(id: string): Promise<SystemInfo> {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    const connection = remote.connection; //Todo depending on os

    // get name
    const nameFileExists = await this.existsInternalAsync(connection, "/etc/os-release");
    let name = "Unknown";
    if (nameFileExists) {
      const nameFile = await this.readTextInternalAsync(connection, "/etc/os-release", "utf-8");
      if (nameFile?.contents) {
        const matches = nameFile.contents.match(/^PRETTY_NAME="([^"]*)"/m);
        if (matches && matches[1]) {
          name = matches[1].trim();
        }
      }
    }

    // get memory usage
    const freeCommandResult = await connection.ssh.exec("free", ["-h"]);
    let totalRam = "Unknown";
    let usedRam = "Unknown";
    let freeRam = "Unknown";
    if (freeCommandResult) {
      const matches = freeCommandResult.match(/^Mem:\s+(\S+)\s+(\S+)\s+(\S+)/m);
      if (matches && matches.length >= 4) {
        totalRam = matches[1].trim(); // Total RAM
        usedRam = matches[2].trim(); // Used RAM
        freeRam = matches[3].trim(); // Free RAM
      }
    }

    // get disk
    const diskCommandResult = await connection.ssh.exec("df", ["-h"]);

    // return info
    return {
      name: name,
      disk: diskCommandResult,
      ramFree: freeRam,
      ramTotal: totalRam,
      ramUsed: usedRam,
    };
  }

  public async getUsersOrGroupsAsync(id: string, fetch: "users" | "groups"): Promise<UserGroup[]> {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return await this.getUsersOrGroupsInternalAsync(remote.connection, fetch);
  }
  public async getUsersOrGroupsInternalAsync(
    connection: RemoteConnection,
    fetch: "users" | "groups"
  ): Promise<UserGroup[]> {
    const command =
      fetch == "users" ? "awk -F: '{ print $1, $3 }' /etc/passwd" : "awk -F: '{ print $1, $3 }' /etc/group";
    const commandResult: string = await connection.ssh.exec(command, []);
    const namesAndIds = commandResult
      .replaceAll("\r", "")
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x && x != "");
    const usersOrGroups: UserGroup[] = [];
    for (let nameAndId of namesAndIds) {
      const split = nameAndId.split(" ");
      if (split.length != 2 || split[0] == "" || split[1] == "") {
        continue;
      }
      usersOrGroups.push({
        name: split[0].trim(),
        id: +split[1].trim(),
      });
    }
    return usersOrGroups;
  }

  public async downloadFileAsync(id: string, filePath: string): Promise<boolean> {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return await this.downloadFileInternalAsync(remote, filePath);
  }
  public async downloadFileInternalAsync(remote: Remote, filePath: string): Promise<boolean> {
    // check
    if (
      filePath == null ||
      filePath == "" ||
      filePath == "/" ||
      filePath == "\\" ||
      filePath == "." ||
      filePath == ".."
    ) {
      throw new Error("invalid file path");
    }

    // get target path from user
    const fileName = path.basename(filePath);
    const saveDialogResult = await dialog.showSaveDialog(mainWindow, {
      title: "Choose path to download file",
      defaultPath: fileName,
      buttonLabel: "Download",
      properties: ["showOverwriteConfirmation", "createDirectory"],
    });

    if (saveDialogResult == null || saveDialogResult.canceled) {
      return false;
    }

    // check local path
    if (!saveDialogResult.filePath || saveDialogResult.filePath == "") {
      return false;
    }

    // check remote path
    const stats = await remote.connection.sftp.stat(filePath);
    if (stats == null || !stats.isFile()) {
      throw new Error("Path cannot be downloaded");
    }

    // delete before download
    if (fs.existsSync(saveDialogResult.filePath)) {
      fs.rmSync(saveDialogResult.filePath);
    }

    // download
    await remote.connection.sftp.fastGet(filePath, saveDialogResult.filePath); //todo track progress via step
    return true;
  }

  public async downloadFolderAsync(id: string, directoryPath: string): Promise<boolean> {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return await this.downloadFolderInternalAsync(remote, directoryPath);
  }
  public async downloadFolderInternalAsync(remote: Remote, directoryPath: string): Promise<boolean> {
    // see this here for reference implementation: https://github.com/steelbrain/node-ssh/blob/main/src/index.ts (getDirectory)

    // check
    if (
      directoryPath == null ||
      directoryPath == "" ||
      directoryPath == "/" ||
      directoryPath == "\\" ||
      directoryPath == "." ||
      directoryPath == ".."
    ) {
      throw new Error("invalid directory path");
    }

    // get target path from user
    const saveDialogResult = await dialog.showOpenDialog(mainWindow, {
      title: "Choose path to download folder",
      buttonLabel: "Download",
      properties: ["openDirectory"],
    });

    if (saveDialogResult == null || saveDialogResult.canceled) {
      return false;
    }

    // check local path
    if (!saveDialogResult.filePaths || saveDialogResult.filePaths.length == 0) {
      return false;
    }
    let targetDirectory = saveDialogResult.filePaths[0];
    if (!targetDirectory || targetDirectory == "") {
      return false;
    }
    targetDirectory = path.join(targetDirectory, path.basename(directoryPath));
    if (fs.existsSync(targetDirectory)) {
      const localStats = await fs.statSync(targetDirectory);
      if (!localStats.isDirectory()) {
        throw new Error("Choosen path must be a directory");
      }
    }

    // check remote path
    const stats = await remote.connection.sftp.stat(directoryPath);
    if (stats == null || !stats.isDirectory()) {
      throw new Error("Path cannot be downloaded");
    }

    // list all files and sort them from A-Z
    let remoteEntries: (RemoteFile & { relativePath?: string; localPath?: string })[] =
      await this.listDirectoryInternalAsync(remote, directoryPath, true); // get everything below that path
    remoteEntries = remoteEntries.filter((x) => x && x.fullName); // filter for files and folders
    remoteEntries.sort((a, b) => a.fullName.localeCompare(b.fullName)); // sort from a-z
    remoteEntries.forEach((x) => {
      // set relative and local path
      x.relativePath = x.fullName.substring(directoryPath.length);
      x.localPath = path.join(targetDirectory, x.relativePath);
    });
    if (remoteEntries.length == 0) {
      return true; // nothing to download
    }

    // create all directories
    const remoteDirs = remoteEntries.filter((x) => x.isDirectory);
    for (let remoteDir of remoteDirs) {
      log.debug(" > check directory", remoteDir.fullName, remoteDir.relativePath, remoteDir.localPath);

      if (!fs.existsSync(remoteDir.localPath)) {
        // which does not exists locally so we create it
        log.debug(" > create directory", remoteDir.localPath);
        fs.mkdirSync(remoteDir.localPath, { recursive: true });
      } else {
        const localStats = fs.statSync(remoteDir.localPath);
        if (localStats?.isDirectory() !== true) {
          // which exists locally but is no directory
          throw new Error("File already exists but there should be a folder: " + remoteDir.localPath);
        }
      }
    }

    // no we can download all files
    const remoteFiles = remoteEntries.filter((x) => x.isRegularFile);
    let allAction: "none" | "skip" | "overwrite" = "none";
    for (let remoteFile of remoteFiles) {
      log.debug(" > check file", remoteFile.fullName, remoteFile.relativePath, remoteFile.localPath);

      // check if already exists
      if (fs.existsSync(remoteFile.localPath)) {
        let action = allAction;
        if (action == "none") {
          // ask user what to do
          const choice = dialog.showMessageBoxSync(mainWindow, {
            title: "File already exists",
            message: `Do you want to overwrite the file "${remoteFile.localPath}"?`,
            buttons: [/*0*/ "Cancel", /*1*/ "Skip", /*2*/ "Skip all", /*3*/ "Overwrite", /*4*/ "Overwrite all"],
          });
          if (choice == 1) {
            action = "skip";
          } else if (choice == 2) {
            action = "skip";
            allAction = "skip";
          } else if (choice == 3) {
            action = "overwrite";
          } else if (choice == 4) {
            action = "overwrite";
            allAction = "overwrite";
          }
        }

        // check action
        if (action == "skip") {
          // we do nothing
          log.debug(" > skip file", remoteFile.localPath);

          continue;
        } else if (action == "overwrite") {
          // we remove it
          log.debug(" > delete local file", remoteFile.localPath);
          fs.rmSync(remoteFile.localPath);
        } else {
          log.debug(" > user cancelled", remoteFile.localPath);
          throw new Error("User cancelled on file: " + remoteFile.localPath);
        }
      }
      if (!fs.existsSync(remoteFile.localPath)) {
        // which does not exists locally so we download it
        log.debug(" > download file", remoteFile.localPath);
        await remote.connection.sftp.fastGet(remoteFile.fullName, remoteFile.localPath);
      } else {
        throw new Error("Cannot download file because it already exists: " + remoteFile.localPath);
      }
    }

    return true;
  }

  public async pickFilePathAsync(
    title: string = undefined,
    buttonLabel: string = undefined,
    fileMustExists: boolean = true
  ): Promise<string | null> {
    // get target path from user
    const dialogResult = await dialog.showOpenDialog(mainWindow, {
      title: title ?? "Choose file to upload",
      buttonLabel: buttonLabel ?? "Choose",
      properties: ["openFile"],
    });

    if (dialogResult == null || dialogResult.canceled) {
      return null;
    }

    // check path
    if (!dialogResult.filePaths || dialogResult.filePaths.length == 0) {
      return null;
    }
    let filePath = dialogResult.filePaths[0];
    if (!filePath || filePath == "") {
      return null;
    }

    if (fileMustExists) {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const stats = await fs.statSync(filePath);
      if (!stats.isFile()) {
        return null;
      }
    }

    // ok
    return filePath;
  }
  public async uploadFileAsync(
    id: string,
    localFilePath: string,
    remoteFilePath: string,
    overwrite: boolean
  ): Promise<void> {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return await this.uploadFileInternalAsync(remote, localFilePath, remoteFilePath, overwrite);
  }
  public async uploadFileInternalAsync(
    remote: Remote,
    localFilePath: string,
    remoteFilePath: string,
    overwrite: boolean
  ): Promise<void> {
    // check local file
    {
      if (localFilePath == null || localFilePath == "") {
        throw new Error("Local file path not provided");
      }
      if (!fs.existsSync(localFilePath)) {
        throw new Error("Local file does not exists");
      }
      const stats = fs.statSync(localFilePath);
      if (stats == null || !stats.isFile()) {
        throw new Error("Local path is not a file");
      }
    }

    // check remote file
    {
      if (remoteFilePath == null || remoteFilePath == "") {
        throw new Error("Remote file path not provided");
      }
      if (await this.existsInternalAsync(remote.connection, remoteFilePath)) {
        // overwrite?
        if (!overwrite) {
          throw new Error("Remote file already exists");
        }

        // it must be a file, we dont overwrite folders
        const stats = await remote.connection.sftp.stat(remoteFilePath);
        if (stats == null || !stats.isFile()) {
          throw new Error("Remote path already exists, but its not a file");
        }
      }
    }

    // upload
    await remote.connection.sftp.fastPut(localFilePath, remoteFilePath); //todo track progress via step
  }

  public listTunnels(id: string): RemoteTunnelDto[] {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });

    return remote.info.tunnels.map((x) => {
      // get matching tunnel from connection
      const connectionTunnel = remote.connection.tunnels.find((c) => c.tunnelId == x.id);
      console.log(connectionTunnel);
      return <RemoteTunnelDto>{
        info: x,
        connected: connectionTunnel?.connection?.server != null,
      };
    });
  }

  public async getTunnelConnectionAsync(
    id: string,
    tunnelId: string
  ): Promise<(TunnelConfig & { server: Server }) | null> {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    return (await remote.connection.ssh.getTunnel(tunnelId)) ?? null;
  }

  public createTunnel(id: string, name: string): RemoteTunnelInfo {
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    log.info(`Create Tunnel: ${name}`);
    const tunnel = <RemoteTunnelInfo>{
      autoConnectOnLogin: false,
      socks: false,
      id: v4(),
      localPort: undefined,
      name: name ?? "Unnamed Tunnel",
      remoteAddress: "",
      remotePort: undefined,
    };

    remote.info.tunnels.push(tunnel);
    this.remotesManager.update(remote.info);
    return tunnel;
  }

  public async removeTunnelAsync(id: string, tunnelId: string) {
    if (tunnelId == null || tunnelId == "") {
      throw new Error("No tunnel given");
    }
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });

    log.info(`Remove Tunnel: ${tunnelId}`);
    await this.disconnectTunnelInternalAsync(remote.connection, tunnelId);
    remote.info.tunnels = remote.info.tunnels.filter((x) => x.id != tunnelId);
    this.remotesManager.update(remote.info);
  }

  public updateTunnel(id: string, tunnel: RemoteTunnelInfo) {
    if (tunnel?.id == null) {
      throw new Error("No tunnel given");
    }
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    const existing = remote.info.tunnels.find((x) => x.id == tunnel.id);
    if (existing == null) {
      throw new Error("Could not find tunnel");
    }

    log.info(`Update Tunnel: ${tunnel.name}`);
    existing.autoConnectOnLogin = tunnel.autoConnectOnLogin ?? false;
    existing.socks = tunnel.socks ?? false;
    existing.localPort = tunnel.localPort;
    existing.name = tunnel.name ?? "";
    existing.remoteAddress = tunnel.remoteAddress ?? "";
    existing.remotePort = tunnel.remotePort;
    this.remotesManager.update(remote.info);
  }

  public async connectTunnelAsync(id: string, tunnelId: string) {
    if (tunnelId == null) {
      throw new Error("No tunnel given");
    }

    // find remote and the tunnel
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    const tunnel = remote.info.tunnels.find((x) => x.id == tunnelId);
    if (tunnel == null) {
      throw new Error("Could not find tunnel");
    }
    return await this.connectTunnelInternalAsync(remote.connection, tunnel);
  }
  public async connectTunnelInternalAsync(connection: RemoteConnection, tunnel: RemoteTunnelInfo) {
    if (tunnel == null) {
      throw new Error("No tunnel given");
    } else if (!this.canStartTunnel(tunnel)) {
      throw new Error("Tunnel not good to start. Please check input");
    }

    // disconnect first
    await this.disconnectTunnelInternalAsync(connection, tunnel.id);

    // establish a connection
    log.info(
      `Create Tunnel from local port ${tunnel.localPort} to remote ${tunnel.remoteAddress}:${tunnel.remotePort} ${
        tunnel.socks == true ? "(socks)" : "(no socks)"
      }`
    );
    const tunnelConnection = await connection.ssh.addTunnel({
      name: tunnel.id,
      localPort: tunnel.localPort,
      remoteAddr: tunnel.remoteAddress ?? "",
      remotePort: tunnel.remotePort,
      socks: tunnel.socks ?? false,
    });
    console.log("CONNECTED", tunnelConnection);
    if (tunnelConnection?.server == null) {
      // unable to connect?
      await this.disconnectTunnelInternalAsync(connection, tunnel.id);
      throw new Error("Unable to connect to tunnel?");
    } else {
      // add to list
      connection.tunnels.push({
        tunnelId: tunnel.id,
        connection: tunnelConnection,
      });
    }
  }

  public async disconnectTunnelAsync(id: string, tunnelId: string) {
    // find remote and the tunnel
    log.info(`Close Tunnel ${tunnelId}`);
    const remote = this.remotesManager.findOrError(id, { mustBeConnected: true });
    await this.disconnectTunnelInternalAsync(remote.connection, tunnelId);
  }
  public async disconnectTunnelInternalAsync(connection: RemoteConnection, tunnelId: string) {
    if (tunnelId == null) {
      throw new Error("No tunnel given");
    }

    // find remote and the tunnel
    await connection.ssh.closeTunnel(tunnelId);
    connection.tunnels = connection.tunnels.filter((x) => x.tunnelId !== tunnelId);
  }

  public canStartTunnel(tunnel: RemoteTunnelInfo): boolean {
    if (!tunnel || !tunnel.id) {
      return false;
    } else if (tunnel.localPort == null || tunnel.localPort <= 0) {
      return false;
    } else if (tunnel.remoteAddress == null || tunnel.remoteAddress == "") {
      return false;
    } else if (tunnel.remotePort == null || tunnel.remotePort <= 0) {
      return false;
    }
    return true;
  }
}

export interface SshCert {
  name: string;
  filePath: string;
}
