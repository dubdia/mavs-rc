import vm from "vm";
import archiver from "archiver/index";
import prompt from "custom-electron-prompt";
import fs from "fs";
import ts from "typescript";
import { app, BrowserWindow, dialog } from "electron";
import { ScriptInfo } from "./models/Script";
import log from "electron-log/main";
import { RemotesManager } from "./remotes-manager";
import { Remote } from "./models/Remote";
import { SshManager } from "./ssh-manager";
import { exec as childProcessExec } from "child_process";
import { OsType } from "../shared/models/OsType";
import { mainWindow } from "./main";
import { currentPath, getPathForOsType } from "../shared/utils/path-utils";
import { ScriptLog } from "../renderer/models/ScriptList";
import { AppConfigManager } from "./config/app-config-manager";

/** used to transcompile and run scripts */
export class ScriptManager {
  private scriptsDir: string;

  constructor(
    private remotesManager: RemotesManager,
    private sshManager: SshManager,
    private appConfigManager: AppConfigManager
  ) {
    // set the scripts directory
    this.scriptsDir = this.getScriptsDir();

    // ensure the dir also exists
    this.ensureScriptsDir();
  }

  private getScriptsDir() {
    let scriptsDir = this.appConfigManager.config.scriptsDir;
    if (scriptsDir == null || scriptsDir == "") {
      // use default dir in home
      const userDataPath = app.getPath("userData");
      scriptsDir = currentPath().join(userDataPath, "scripts");
    }
    return scriptsDir;
  }

  /** ensures that the scripts folder exists */
  public ensureScriptsDir() {
    if (!fs.existsSync(this.scriptsDir)) {
      // create it
      fs.mkdirSync(this.scriptsDir);
      log.info(`Created scripts directory: ${this.scriptsDir}`);
    }

    // check if its a folder
    const scriptsDirStats = fs.statSync(this.scriptsDir);
    if (scriptsDirStats == null || !scriptsDirStats.isDirectory()) {
      throw new Error(`Path to scripts is not a directory: ${this.scriptsDir}`);
    }
    log.info(`Use scripts directory: ${this.scriptsDir}`);
  }

  /** returns a list of all scripts */
  public listScripts({ withContents }: { withContents?: boolean } = {}): ScriptInfo[] {
    // get folder
    if (!fs.existsSync(this.scriptsDir)) {
      log.warn(`Scripts directory does not exists: ${this.scriptsDir}`);
      return [];
    }

    // get all folders
    const entries = fs.readdirSync(this.scriptsDir, {
      recursive: false,
      withFileTypes: true,
    });

    // get all folders containing a script.ts
    const scripts: ScriptInfo[] = [];
    for (const dir of entries) {
      // check if its a folder
      if (!dir.isDirectory()) {
        continue;
      }
      if (dir.name.startsWith(".")) {
        continue;
      }

      // read script
      const script = this.readScript(dir.name, { withContents: withContents });
      if (script) {
        scripts.push(script);
      }
    }
    return scripts;
  }

  public readScript(name: string, { withContents }: { withContents?: boolean } = {}): ScriptInfo | null {
    if (name == null || name == "") {
      return null;
    }
    const paths = this.getScriptPath(name);
    if (!fs.existsSync(paths.dir)) {
      return null;
    }
    const scriptFileStats = fs.statSync(paths.filePath);
    if (scriptFileStats == null || !scriptFileStats.isFile()) {
      return null;
    }

    /** read optional contents */
    let contents: string | null = null;
    if (withContents) {
      contents = fs.readFileSync(paths.filePath, {
        encoding: "utf-8",
      });
    }

    // yes
    return {
      scriptFilePath: paths.filePath,
      scriptDir: paths.dir,
      name: name,
      normalizedName: this.normalizeScriptName(name),
      contents: contents,
    };
  }
  public readScriptOrError(name: string, { withContents }: { withContents?: boolean } = {}): ScriptInfo {
    const script = this.readScript(name, { withContents: withContents });
    if (script == null) {
      throw new Error("Script not found");
    }
    return script;
  }

  private normalizeScriptName(name: string): string {
    return name.trim().toLowerCase();
  }
  private getScriptPath(name: string): { dir: string; filePath: string } {
    const scriptDir = currentPath().join(this.scriptsDir, name);
    const scriptFilePath = currentPath().join(scriptDir, "script.ts");
    return { dir: scriptDir, filePath: scriptFilePath };
  }

  public addNew(name: string): ScriptInfo {
    // check name
    const normalizedName = this.normalizeScriptName(name ?? "");
    if (
      normalizedName == null ||
      normalizedName == "" ||
      normalizedName.startsWith(".") ||
      normalizedName.length > 64
    ) {
      throw new Error("No valid name was given");
    }

    // list all scripts
    const scripts = this.listScripts();
    if (scripts.find((x) => x.normalizedName == normalizedName)) {
      throw new Error("A script with this name already exists");
    }

    // create folder
    const paths = this.getScriptPath(name);
    if (fs.existsSync(paths.dir) || fs.existsSync(paths.filePath)) {
      throw new Error("A folder with the name of the script already exists");
    }
    fs.mkdirSync(paths.dir);

    // write script file
    const content = "// " + name + "\nasync function run() {\n    // write your typescript code here:\n    \n}";
    fs.writeFileSync(paths.filePath, content, {
      flush: true,
    });

    log.info(`Created new Script: ${paths.filePath}`);
    return this.readScriptOrError(name, { withContents: true });
  }
  public delete(name: string, { hardDelete }: { hardDelete?: boolean } = {}) {
    const script = this.readScriptOrError(name);

    // rename directory => prefix it with a dot to hide it
    if (hardDelete === true) {
      fs.rmSync(script.scriptDir, { recursive: true, force: true });
    } else {
      const oldDir = script.scriptDir;
      const newDir = this.getScriptPath("." + script.name).dir;
      fs.renameSync(oldDir, newDir);
    }
  }
  public update(name: string, contents: string) {
    const script = this.readScriptOrError(name);
    fs.writeFileSync(script.scriptFilePath, contents);
  }

  /** transpiles and executes and contents of given script for given remote */
  public async executeAsync(remoteId: string, name: string): Promise<ScriptExecutionResult> {
    // find remote and script
    const remote = this.remotesManager.findOrError(remoteId, { mustBeConnected: true });
    if (remote == null || remote.connection == null) {
      return { success: false, error: "Remote cannot be found or is not connected" };
    }

    const script = this.readScript(name, { withContents: true });
    if (!script) {
      return { success: false, error: "The script was not found" };
    }
    if (script.contents == null || script.contents == "") {
      return { success: false, error: "The script is empty" };
    }
    //Todo set script to running

    // transpile
    let transpilation: ts.TranspileOutput;
    try {
      transpilation = this.transpile(script.contents);
      if (transpilation == null) {
        return { success: false, error: "Transpilation failed without error" };
      } else if (transpilation.outputText == null || transpilation.outputText == "") {
        if (transpilation.diagnostics == null || transpilation.diagnostics.length == 0) {
          return { success: false, error: "Transpiled empty javascript. Aborted execution" };
        } else {
          const diagnostics = transpilation.diagnostics.map((x) => x.messageText).join("\n");
          return { success: false, error: "Transpilation failed with errors:\n" + diagnostics };
        }
      }
    } catch (err) {
      log.error("Failed to transpile", err, script.contents);
      return { success: false, error: "An error occured during typescript transpilation: " + err?.toString() };
    }

    // create context
    let context: vm.Context;
    try {
      context = this.createContext(remote, script);
      if (context == null) {
        throw new Error("createContext returned null");
      }
    } catch (err) {
      log.error("Failed to create script execution context", err);
      return { success: false, error: "Failed to create script execution context: " + err?.toString() };
    }

    // execute
    try {
      log.verbose("Start execution of script", transpilation.outputText);

      const result = await new Promise((resolve, reject) => {
        // add functions to resolve and reject THIS promise to the context.
        // so the script itself will end the execution/ resolve the promise.
        // see the extra lines added to the transpile() method
        context.__resolve = (err: unknown) => {
          resolve(err);
        };
        context.__reject = (arg: unknown) => {
          reject(arg);
        };
        vm.runInContext(transpilation.outputText, context);
      });

      log.verbose("Script executed successfully", result);
      return { success: true, error: null };
    } catch (err) {
      if (err && err instanceof ScriptExit) {
        // the script exited purposly via an error
        log.verbose("The script exited by throwing the ExitScript-Error", err);
        return {
          success: false,
          error: `Script exited ${err.message && err.message.length > 0 ? ": " + err.message : ""}`,
        };
      } else {
        // the script failed due a runtime error
        log.verbose("A runtime error occured while executing the script", err);
        return { success: false, error: "Runtime error: " + err?.toString() };
      }
    }
  }

  /** transpiles given typescript to javascript */
  private transpile(tsCode: string): ts.TranspileOutput {
    // wrap user code in our code so it can handle promises
    const start = "";
    const end = "\n;run().then(() =>  __resolve('OK')).catch((err) => __reject(err))";
    const combined = start + tsCode + end;

    //const start = "(async () => {\n";
    //const end = "\n;})().then(() =>  __resolve('OK')).catch((err) => __reject(err))";
    //const combined = start + tsCode + end;

    const result = ts.transpileModule(combined, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        allowJs: true,
        allowUnreachableCode: true,
      },
    });
    return result;
  }

  /** creates a new script-execution vm context */
  private createContext(remote: Remote, script: ScriptInfo): vm.Context {
    const exec = <T>(name: string, ignoreErrors: boolean, func: () => T): T => {
      try {
        console.log(`execute ${name}`);
        return func();
      } catch (err) {
        console.error(`failed to execute ${name}`, err);
        if (ignoreErrors !== true) {
          throw err;
        }
      }
    };
    const execAsync = async <T>(name: string, ignoreErrors: boolean, func: () => Promise<T>): Promise<T> => {
      try {
        console.log(`execute ${name}`);
        return await func();
      } catch (err) {
        console.error(`failed to execute async ${name}`, err);
        if (ignoreErrors !== true) {
          throw err;
        }
      }
    };
    const execCallback = async <T>(
      name: string,
      ignoreErrors: boolean,
      func: (resolve: (arg?: T) => void, reject: (error: unknown) => void) => void
    ): Promise<T> => {
      try {
        console.log(`execute ${name}`);
        return await new Promise((resolve, reject) => {
          try {
            func(resolve, reject);
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        console.error(`failed to execute async ${name}`, err);
        if (ignoreErrors !== true) {
          throw err;
        }
      }
    };

    const context: typeof ScriptContractV1 = {
      // constants
      remoteId: remote.info.id,
      remoteName: remote.info.name,

      scriptDirectory: script.scriptDir,
      scriptName: script.name,
      scriptFilePath: script.scriptFilePath,

      remotePosixType: remote.connection?.osType == OsType.Windows ? "windows" : "posix",

      // generic functions
      alert: (message) =>
        exec("alert", false, () => {
          dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), {
            type: "info",
            buttons: ["OK"],
            title: "Alert",
            message: message?.toString() ?? "",
          });
        }),
      confirm: (message) =>
        exec("confirm", false, () => {
          const response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), {
            type: "question",
            buttons: ["Yes", "No"],
            title: "Confirm",
            message: message?.toString() ?? "",
          });
          return response === 0; // 0 is the index of the 'Yes' button
        }),
      prompt: (message, options) =>
        execAsync<string | null>("prompt", false, async () => {
          const response = await prompt({
            title: message?.toString() ?? "",
            type: "input",
            value: options.defaultText,
            label: options.label ?? "Input:",
          });
          if (response == null) {
            return null;
          } else {
            return response.toString();
          }
        }),
      log: (message, ...optionalParams) =>
        exec("log", false, () => {
          log.verbose("Log from Script:", message, ...optionalParams);
          const stringify = (data: unknown) => {
            if (data == null || data == "") {
              return "";
            } else if (typeof data === "object") {
              return JSON.stringify(data);
            } else {
              return data.toString();
            }
          };
          const scriptLog = <ScriptLog>{
            timestamp: new Date().getTime(),
            message: stringify(message),
            params:
              optionalParams && optionalParams.length && optionalParams.map
                ? optionalParams.map((x) => stringify(x)).filter((x) => x && x != "")
                : [],
          };
          mainWindow.webContents.send("scriptLog", remote.info.id, script.name, scriptLog);
        }),
      delay: (timeInMs) =>
        execAsync("delay", false, async () => {
          await new Promise((res) => {
            setTimeout(res, timeInMs);
          });
        }),
      exit: (message) =>
        exec("exit", false, () => {
          throw new ScriptExit(message?.toString() ?? "");
        }),

      // local operations
      local: {
        // folder
        mkDir: (path, options) =>
          execCallback("local mkDir", options?.ignoreErrors, (resolve, reject) => {
            // check if its already there
            if (!options?.errorIfAlreadyExists && fs.existsSync(path)) {
              const stats = fs.statSync(path);
              if (stats == null || !stats.isDirectory()) {
                reject("Path already exists but is not a directory");
              } else {
                resolve();
              }
              return;
            }

            fs.mkdir(path, { recursive: true }, (err, _path) => {
              if (err != null) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        rmDir: (path, options) =>
          execCallback("local rmDir", options?.ignoreErrors, (resolve, reject) => {
            // check if its not there
            if (!options?.errorIfNotFound && !fs.existsSync(path)) {
              resolve();
              return;
            }

            // remove
            fs.rmdir(path, {}, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        listDir: (path, options) =>
          execCallback("local listDir", options?.ignoreErrors, (resolve, reject) => {
            fs.readdir(path, { recursive: options?.recursive === true }, (err, files) => {
              if (err) {
                reject(err);
              } else {
                resolve(files as string[]);
              }
            });
          }),
        dirExists: (filePath, options) =>
          execCallback("local dirExists", options?.ignoreErrors, (resolve, reject) => {
            const exists = fs.existsSync(filePath);
            if (!exists) {
              return resolve(false);
            }

            fs.stat(filePath, (err, stats) => {
              if (err) {
                reject(err);
              } else {
                resolve(stats && stats.isDirectory());
              }
            });
          }),

        // file
        deleteFile: (filePath, options) =>
          execCallback("local deleteFile", options?.ignoreErrors, (resolve, reject) => {
            const exists = fs.existsSync(filePath);
            if (!exists) {
              if (!options?.errorIfNotFound) {
                return resolve();
              } else {
                return reject("File does not exists");
              }
            }

            const stat = fs.statSync(filePath, { throwIfNoEntry: false });
            if (stat == null) {
              reject("Unable to get stats");
            } else if (!stat.isFile()) {
              reject("Entry at that path is not a file!");
            }
            fs.rm(filePath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        fileExists: (filePath, options) =>
          execCallback("local fileExists", options?.ignoreErrors, (resolve, reject) => {
            // check for file or dir
            if (!fs.statSync(filePath)) {
              resolve(false);
            }

            // get stats and check if file
            fs.stat(filePath, (err, stats) => {
              if (err) {
                reject(err);
              } else {
                resolve(stats && stats.isFile());
              }
            });
          }),
        readFileText: (filePath, options) =>
          execCallback("local readFileText", options?.ignoreErrors, (resolve, reject) => {
            fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          }),
        readFileBuffer: (filePath, options) =>
          execCallback("local readFileBuffer", options?.ignoreErrors, (resolve, reject) => {
            fs.readFile(filePath, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          }),
        writeFileText: (filePath, contents, options) =>
          execCallback("local writeFileText", options?.ignoreErrors, (resolve, reject) => {
            fs.writeFile(filePath, contents, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        chmod: (path, mode, options) =>
          execCallback("local chmod", options?.ignoreErrors, (resolve, reject) => {
            fs.chmod(path, mode, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        chown: (path, uid, gid, options) =>
          execCallback("local chmod", options?.ignoreErrors, (resolve, reject) => {
            fs.chown(path, uid, gid, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),

        copyFile: (sourceFilePath, targetFilePath, options) =>
          execCallback("local copyFile", options?.ignoreErrors, (resolve, reject) => {
            if (!fs.existsSync(sourceFilePath)) {
              reject("Source file does not exists");
            }
            if (options.overwrite !== true) {
              if (fs.existsSync(targetFilePath)) {
                reject("Target file already exists");
              }
            }
            fs.copyFile(sourceFilePath, targetFilePath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        copyDir: (sourcePath, targetPath, options) =>
          execCallback("local copyDir", options?.ignoreErrors, (resolve, reject) => {
            if (!fs.existsSync(sourcePath)) {
              reject("Source dir does not exists");
            }
            if (options.overwrite !== true) {
              if (fs.existsSync(targetPath)) {
                reject("Target dir already exists");
              }
            }
            fs.cp(sourcePath, targetPath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),

        // other
        stats: (path, options) =>
          execCallback("local stats", options?.ignoreErrors, (resolve, reject) => {
            fs.stat(path, (err, stats) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  path: path,
                  isBlockDevice: stats.isBlockDevice(),
                  isCharacterDevice: stats.isCharacterDevice(),
                  isDirectory: stats.isDirectory(),
                  isFIFO: stats.isFIFO(),
                  isFile: stats.isFile(),
                  isSocket: stats.isSocket(),
                  isSymbolicLink: stats.isSymbolicLink(),
                  atime: stats.atimeMs,
                  mtime: stats.mtimeMs,
                  gid: stats.gid,
                  uid: stats.uid,
                  mode: stats.mode,
                  size: stats.size,
                });
              }
            });
          }),
        move: (oldPath, newPath, options) =>
          execCallback("local move", options?.ignoreErrors, (resolve, reject) => {
            fs.rename(oldPath, newPath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        exec: (command, options) =>
          execCallback("local exec", options?.ignoreErrors, (resolve, reject) => {
            childProcessExec(command, { encoding: "utf-8" }, (err, stdOut, stdErr) => {
              if (err) {
                reject(err);
              } else {
                resolve({ stdout: stdOut, stderr: stdErr });
              }
            });
          }),

        // zip
        zipDirectory: (sourcePath, targetZipPath, options) =>
          execAsync("local zip directory", options?.ignoreErrors, async () => {
            // check
            if (!fs.existsSync(sourcePath)) {
              throw new Error("Directory to zip does not exists");
            }
            if (options.overwrite !== true) {
              if (fs.existsSync(targetZipPath)) {
                throw new Error("Target zip file already exists");
              }
            }

            // zip
            const archive = archiver("zip", { zlib: { level: 9 } });
            const stream = fs.createWriteStream(targetZipPath);
            try {
              await new Promise((resolve, reject) => {
                archive
                  .directory(sourcePath, false)
                  .on("error", (err: archiver.ArchiverError) => reject(err))
                  .pipe(stream);

                stream.on("close", () => resolve(true));
                archive.finalize();
              });
            } finally {
              stream.close();
              stream.destroy();
            }
          }),
        zipFile: (sourceFilePath, targetZipPath, options) =>
          execAsync("local zip file", options?.ignoreErrors, async () => {
            // check
            if (!fs.existsSync(sourceFilePath)) {
              throw new Error("File to zip does not exists");
            }
            if (options.overwrite !== true) {
              if (fs.existsSync(targetZipPath)) {
                throw new Error("Target zip file already exists");
              }
            }

            // zip
            const archive = archiver("zip", { zlib: { level: 9 } });
            const stream = fs.createWriteStream(targetZipPath);
            try {
              await new Promise((resolve, reject) => {
                archive
                  .file(sourceFilePath, { name: currentPath().basename(sourceFilePath) })
                  .on("error", (err: archiver.ArchiverError) => reject(err))
                  .pipe(stream);

                stream.on("close", () => resolve(true));
                archive.finalize();
              });
            } finally {
              stream.close();
              stream.destroy();
            }
          }),

        // path
        isAbsolutePath: (path: string) =>
          exec("local isAbsolutePath", false, () => {
            return currentPath().isAbsolute(path);
          }),

        joinPath: (...paths: string[]) =>
          exec("local joinPath", false, () => {
            return currentPath().join(...paths);
          }),

        getDirName: (path) =>
          exec("local getDirName", false, () => {
            return currentPath().dirname(path);
          }),
        getFileName: (path) =>
          exec("local getFileName", false, () => {
            return currentPath().basename(path);
          }),
        getExtension: (path) =>
          exec("local getExtension", false, () => {
            return currentPath().extname(path);
          }),

        resolvePath: (...paths: string[]) =>
          exec("local resolvePath", false, () => {
            return currentPath().resolve(...paths);
          }),
        normalizePath: (path: string) =>
          exec("local normalizePath", false, () => {
            return currentPath().normalize(path);
          }),
      },

      // remote operations
      remote: {
        // folder
        mkDir: (path, options) =>
          execAsync("remote mkDir", options?.ignoreErrors, async () => {
            // check if its already there
            if (!options?.errorIfAlreadyExists && (await remote.connection.sftp.exists(path))) {
              const stats = await remote.connection.sftp.stat(path);
              if (stats == null || !stats.isDirectory()) {
                throw "Path already exists but is not a directory";
              }
              return;
            }
            await remote.connection.sftp.mkdir(path);
          }),
        rmDir: (path, options) =>
          execAsync("remote rmDir", options?.ignoreErrors, async () => {
            // check if its not there
            if (!options?.errorIfNotFound) {
              const exists = await remote.connection.sftp.exists(path);
              if (!exists) {
                return;
              }
            }
            await remote.connection.sftp.rmdir(path);
          }),
        listDir: (path, options) =>
          execAsync("remote listDir", options.ignoreErrors, async () => {
            const listDir = async (dir: string): Promise<string[]> => {
              const result = await remote.connection.sftp.readdir(dir);
              const entries: string[] = [];

              // recursive?
              if (options?.recursive === true) {
                for (const fileOrFolder of result) {
                  // check if normal directory
                  if (fileOrFolder == null || !fileOrFolder.attrs.isDirectory()) {
                    continue;
                  }
                  if (
                    fileOrFolder.filename == null ||
                    fileOrFolder.filename == "" ||
                    fileOrFolder.filename == "." ||
                    fileOrFolder.filename == ".." ||
                    fileOrFolder.filename == "/" ||
                    fileOrFolder.filename == "\\"
                  ) {
                    continue;
                  }
                  if (fileOrFolder.longname == null || fileOrFolder.longname == "" || fileOrFolder.longname == path) {
                    continue;
                  }

                  // add contents of it too
                  const contentsOfSubDir = await listDir(fileOrFolder.longname);
                  entries.push(...contentsOfSubDir);
                }
              }
              return entries;
            };
            const entries = await listDir(path);
            return entries;
          }),
        dirExists: (path, options) =>
          execAsync("remote dirExists", options?.ignoreErrors, async () => {
            const stats = await remote.connection.sftp.exists(path);
            return stats && stats.isDirectory();
          }),

        // file
        deleteFile: (filePath, options) =>
          execAsync("remote deleteFile", options?.ignoreErrors, async () => {
            const stats = await remote.connection.sftp.exists(filePath);
            if (!options?.errorIfNotFound && stats == null) {
              return;
            } else if (stats == null) {
              throw new Error("File does not exists");
            } else if (!stats.isFile()) {
              throw new Error("Entry at that path is not a file!");
            }
            await remote.connection.sftp.unlink(filePath);
          }),
        fileExists: (filePath, options) =>
          execAsync("remote fileExists", options?.ignoreErrors, async () => {
            const stats = await remote.connection.sftp.exists(filePath);
            return stats && stats.isFile();
          }),
        readFileText: (filePath, options) =>
          execAsync("remote readFileText", options?.ignoreErrors, async () => {
            return await remote.connection.sftp.readFile(filePath, "utf8");
          }),
        readFileBuffer: (filePath, options) =>
          execAsync("remote readFileBuffer", options?.ignoreErrors, async () => {
            throw new Error("not implemented");
          }),
        writeFileText: (filePath, contents, options) =>
          execAsync("remote writeFileText", options?.ignoreErrors, async () => {
            await remote.connection.sftp.writeFile(filePath, contents, null);
          }),
        downloadFile: (remoteFilePath, localFilePath, options) =>
          execAsync("remote download file", options?.ignoreErrors, async () => {
            // check
            try {
              const stats = await remote.connection.sftp.exists(remoteFilePath);
              if (stats == null || !stats.isFile()) {
                throw new Error("File on remote does not exists or is not a file");
              }
            } catch (err) {
              if (err == "No such file") {
                throw new Error("File on remote does not exists");
              } else {
                throw err;
              }
            }
            if (options.overwrite !== true) {
              if (fs.existsSync(localFilePath)) {
                throw new Error("Target local file already exists");
              }
            }
            // download
            await remote.connection.sftp.fastGet(remoteFilePath, localFilePath);
          }),
        uploadFile: (localFilePath, remoteFilePath, options) =>
          execAsync("remote download file", options?.ignoreErrors, async () => {
            // check
            if (!fs.existsSync(localFilePath)) {
              throw new Error("Source local file does not exists");
            }
            if (options.overwrite !== true) {
              try {
                const stats = await remote.connection.sftp.exists(remoteFilePath);
                if (stats) {
                  throw new Error("Target remote file already exists");
                }
              } catch (err) {
                if (err != "No such file") {
                  throw err;
                }
              }
            }

            // upload
            await remote.connection.sftp.fastPut(localFilePath, remoteFilePath);
          }),
        chmod: (path, mode, options) =>
          execAsync("remote chmod", options?.ignoreErrors, async () => {
            await remote.connection.sftp.chmod(path, mode);
          }),
        chown: (path, uid, gid, options) =>
          execAsync("remote chown", options?.ignoreErrors, async () => {
            await remote.connection.sftp.chown(path, uid, gid);
          }),

        // other
        stats: (path, options) =>
          execAsync("remote stats", options?.ignoreErrors, async () => {
            const stats = await remote.connection.sftp.stat(path);
            return {
              path: path,
              isBlockDevice: stats.isBlockDevice(),
              isCharacterDevice: stats.isCharacterDevice(),
              isDirectory: stats.isDirectory(),
              isFIFO: stats.isFIFO(),
              isFile: stats.isFile(),
              isSocket: stats.isSocket(),
              isSymbolicLink: stats.isSymbolicLink(),
              atime: stats.atime,
              mtime: stats.mtime,
              gid: stats.gid,
              uid: stats.uid,
              mode: stats.mode,
              size: stats.size,
            };
          }),
        move: (oldPath, newPath, options) =>
          execAsync("remote move", options?.ignoreErrors, async () => {
            await remote.connection.sftp.rename(oldPath, newPath);
          }),
        exec: (command, options) =>
          execAsync("remote exec", options?.ignoreErrors, async () => {
            try {
              const result = await remote.connection.ssh.exec(command);
              return { stdout: result, stderr: null };
            } catch (err) {
              return { stdout: null, stderr: err };
            }
          }),

        // path
        isAbsolutePath: (path: string) =>
          exec("remote isAbsolutePath", false, () => {
            return getPathForOsType(remote.connection.osType).isAbsolute(path);
          }),
        joinPath: (...paths: string[]) =>
          exec("remote joinPath", false, () => {
            return getPathForOsType(remote.connection.osType).join(...paths);
          }),

        getDirName: (path) =>
          exec("remote getDirName", false, () => {
            return getPathForOsType(remote.connection.osType).dirname(path);
          }),
        getFileName: (path) =>
          exec("remote getFileName", false, () => {
            return getPathForOsType(remote.connection.osType).basename(path);
          }),
        getExtension: (path) =>
          exec("remote getExtension", false, () => {
            return getPathForOsType(remote.connection.osType).extname(path);
          }),
      },
    };
    return vm.createContext(context);
  }
}

export interface ScriptExecutionResult {
  success: boolean;
  error: string;
}

/** throw this error inside a script at runtime to exit it */
export class ScriptExit extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, ScriptExit.prototype);
  }
}
