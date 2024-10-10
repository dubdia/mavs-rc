import vm from "vm";
import fs, { mkdir } from "fs";
import ts, { ExitStatus } from "typescript";
import { BrowserWindow, dialog } from "electron";
import { ScriptConfigManager } from "./config/script-config-manager";
import { Script, ScriptInfo } from "./models/Script";
import log from "electron-log/main";
import { v4 } from "uuid";
import { RemotesManager } from "./remotes-manager";
import { array, string } from "prop-types";
import { Remote } from "./models/Remote";
import { ChildProcess, execSync, spawn } from "child_process";
import { SshManager } from "./ssh-manager";
import { exec as childProcessExec } from "child_process";
import { FileEntryWithStats } from "ssh2";
import { joinPath } from "../shared/utils/io/joinPath";

/** used to transcompile and run scripts */
export class ScriptManager {
  private config = new ScriptConfigManager();
  private scripts: Script[] = [];

  constructor(private remotesManager: RemotesManager, private sshManager: SshManager) {
    // load remotes from config
    this.scripts = this.config.config.scripts
      .filter((x) => x != null && x.scriptId != null && x.scriptId != "")
      .map((x) => {
        return <Script>{
          info: x,
          running: false,
        };
      });
    log.info(`Loaded ${this.scripts.length} scripts from config`);
  }

  private updateConfig() {
    // update and save config
    log.verbose("Update config");
    this.config.config.scripts = this.scripts.filter((x) => x?.info?.scriptId != null).map((x) => x.info);
    this.config.saveConfig();
  }

  public findOrError(id: string, { mustBeRunning }: { mustBeRunning?: boolean } = {}): Script {
    if (id == null || id == "") {
      throw new Error(`Could not find script with empty id`);
    }
    const element = this.scripts.find((x) => x.info.scriptId == id);
    if (element == null) {
      throw new Error(`Could not find script with id ${id}`);
    } else if (mustBeRunning == true && !element.running) {
      throw new Error(`Script with id ${id} is not running`);
    } else if (mustBeRunning == false && element.running) {
      throw new Error(`Script with id ${id} is running`);
    }
    return element;
  }

  public listScripts(): Script[] {
    return this.scripts;
  }
  public addNew(name?: string): Script {
    if (name == null || name == "") {
      name = `Script #${this.scripts.length + 1}`;
    }
    const newScript = <Script>{
      info: {
        content: "// write your typescript code here:\nalert('Hello World');\n",
        name: name,
        scriptId: v4(),
      },
      running: false,
    };
    this.scripts.unshift(newScript);
    this.updateConfig();
    log.info(`Added new Script: ${newScript.info.name}`);
    return newScript;
  }
  public async deleteByIdAsync(id: string) {
    log.info("Delete script");
    this.scripts = this.scripts.filter((x) => x.info.scriptId == id);
    this.updateConfig();
  }
  public update(scriptInfo: ScriptInfo) {
    log.info("Update script");
    // check
    if (scriptInfo == null || scriptInfo.scriptId == null) {
      throw new Error("no or invalid script info given");
    }

    // find by id and update
    const remote = this.findOrError(scriptInfo.scriptId);
    remote.info = scriptInfo;

    // save config
    this.updateConfig();
  }

  /** transpiles and executes and contents of given script for given remote */
  public async executeAsync(remoteId: string, scriptId: string): Promise<ScriptExecutionResult> {
    // find remote and script
    const remote = this.remotesManager.findOrError(remoteId, { mustBeConnected: true });
    if (remote == null || remote.connection == null) {
      return { success: false, error: "Remote cannot be found or is not connected" };
    }

    const script = this.findOrError(scriptId, { mustBeRunning: false });
    if (script == null || script.info == null) {
      return { success: false, error: "Script cannot be found" };
    } else if (script.running) {
      return { success: false, error: "Script is already running" };
    } else if (script.info.content == null || script.info.content == "") {
      return { success: false, error: "Script is empty" };
    }

    // transpile
    let transpilation: ts.TranspileOutput;
    try {
      transpilation = this.transpile(script.info.content);
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
      log.error("Failed to transpile", err, script.info.content);
      return { success: false, error: "An error occured during typescript transpilation: " + err?.toString() };
    }

    // create context
    let context: vm.Context;
    try {
      context = this.createContext(remote);
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
        context.__resolve = (err: any) => {
          log.verbose("Resolve vm promise");
          resolve(err);
        };
        context.__reject = (arg:any) => {
          log.verbose("Reject vm promise");
          reject(arg);
        };
        vm.runInContext(transpilation.outputText, context);
      });

      log.verbose("Script executed successfully", result);
      return { success: true, error: null };
    } catch (err) {
      log.verbose("A runtime error occured while executing the script", err);
      return { success: false, error: "Runtime error: " + err?.toString() };
    }
  }

  /** transpiles given typescript to javascript */
  private transpile(tsCode: string): ts.TranspileOutput {
    // wrap user code in our code so it can handle promises
    const start = "";
    const end = "\n;run().then(() =>  __resolve('OK').catch((err) => __reject(err))";
    const combined = start + tsCode + end;

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
  private createContext(remote: Remote): vm.Context {
    const exec = <T>(name: string, ignoreErrors: boolean, func: () => T): T => {
      try {
        console.log(`execute ${name}`, arguments);
        return func();
      } catch (err) {
        console.error(`failed to execute ${name}`, err);
        if (!ignoreErrors) {
          throw err.toString();
        }
      }
    };
    const execAsync = async <T>(name: string, ignoreErrors: boolean, func: () => Promise<T>): Promise<T> => {
      try {
        console.log(`execute ${name}`, arguments);
        return await func();
      } catch (err) {
        console.error(`failed to execute async ${name}`, err);
        if (!ignoreErrors) {
          throw err;
        }
      }
    };
    const execCallback = async <T>(
      name: string,
      ignoreErrors: boolean,
      func: (resolve: (arg?: T) => void, reject: (error: any) => void) => void
    ): Promise<T> => {
      try {
        console.log(`execute ${name}`, arguments);
        return await new Promise((resolve, reject) => {
          try {
            func(resolve, reject);
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        console.error(`failed to execute async ${name}`, err);
        if (!ignoreErrors) {
          throw err;
        }
      }
    };
    const ssh = this.sshManager;

    const context: typeof ScriptContractV1 = {
      // constants
      remoteId: remote.info.id,
      remoteName: remote.info.name,

      // generic functions
      alert: (message) =>
        exec("alert", false, () => {
          dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), {
            type: "info",
            buttons: ["OK"],
            title: "Alert",
            message: message,
          });
        }),
      confirm: (message) =>
        exec("confirm", false, () => {
          const response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), {
            type: "question",
            buttons: ["Yes", "No"],
            title: "Confirm",
            message: message,
          });
          return response === 0; // 0 is the index of the 'Yes' button
        }),
      log: (message, optionalParams) =>
        exec("log", true, () => {
          console.log(message, optionalParams);
        }),

      // local operations
      local: {
        // folder
        mkDir: (path, { ignoreErrors }) =>
          execCallback("local mkDir", ignoreErrors, (resolve, reject) => {
            fs.mkdir(path, { recursive: true }, (err, path) => {
              if (err != null) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        rmDir: (path, { ignoreErrors }) =>
          execCallback("local mkDir", ignoreErrors, (resolve, reject) => {
            fs.rmdir(path, {}, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        listDir: (path, { recursive }) =>
          execCallback("local listDir", false, (resolve, reject) => {
            fs.readdir(path, { recursive: recursive }, (err, files) => {
              if (err) {
                reject(err);
              } else {
                resolve(files as string[]);
              }
            });
          }),
        dirExists: (filePath, { ignoreErrors }) =>
          execCallback("local dirExists", false, (resolve, reject) => {
            const exists = fs.existsSync(filePath);
            if (!exists) {
              return false;
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
        deleteFile: (filePath, { ignoreErrors }) =>
          execCallback("local deleteFile", ignoreErrors, (resolve, reject) => {
            const exists = fs.existsSync(filePath);
            if (!exists) {
              return false;
            }
            const stat = fs.statSync(filePath, { throwIfNoEntry: false });
            if (stat == null) {
              return;
            } else if (!stat.isFile()) {
              throw new Error("Entry at that path is not a file!");
            }
            fs.rm(filePath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),
        fileExists: (filePath) =>
          execCallback("local fileExists", false, (resolve, reject) => {
            const stat = fs.stat(filePath, (err, stats) => {
              if (err) {
                reject(err);
              } else {
                resolve(stats && stats.isFile());
              }
            });
          }),
        readFileText: (filePath, { ignoreErrors }) =>
          execCallback("local readFileText", ignoreErrors, (resolve, reject) => {
            fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          }),
        readFileBuffer: (filePath, { ignoreErrors }) =>
          execCallback("local readFileBuffer", ignoreErrors, (resolve, reject) => {
            fs.readFile(filePath, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          }),
        writeFileText: (filePath, contents, { ignoreErrors }) =>
          execCallback("local readFileText", ignoreErrors, (resolve, reject) => {
            fs.writeFile(filePath, contents, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }),

        // other
        exec: (command, { ignoreErrors }) =>
          execCallback("local exec", ignoreErrors, (resolve, reject) => {
            childProcessExec(command, { encoding: "utf-8" }, (err, stdOut, stdErr) => {
              if (err) {
                reject(err);
              } else {
                resolve({ stdout: stdOut, stderr: stdErr });
              }
            });
          }),
      },

      // remote operations
      remote: {
        // folder
        mkDir: (path, { ignoreErrors }) =>
          execAsync("remote mkDir", ignoreErrors, async () => {
            await remote.connection.sftp.mkdir(path);
          }),
        rmDir: (path, { ignoreErrors }) =>
          execAsync("remote mkDir", ignoreErrors, async () => {
            await remote.connection.sftp.rmdir(path);
          }),
        listDir: (path, { recursive }) =>
          execAsync("remote listDir", false, async () => {
            const listDir = async (dir: string): Promise<string[]> => {
              const result = await remote.connection.sftp.readdir(dir);
              const entries: string[] = [];

              // recursive?
              if (recursive) {
                for (let fileOrFolder of result) {
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
        dirExists: (filePath, { ignoreErrors }) =>
          execAsync("remote dirExists", false, async () => {
            const stats = await remote.connection.sftp.stat(filePath);
            return stats != null && stats.isDirectory();
          }),

        // file
        deleteFile: (filePath, { ignoreErrors }) =>
          execAsync("remote deleteFile", ignoreErrors, async () => {
            const stats = await remote.connection.sftp.stat(filePath);
            if (stats == null) {
              return;
            } else if (!stats.isFile()) {
              throw new Error("Entry at that path is not a file!");
            }
            await remote.connection.sftp.unlink(filePath);
          }),
        fileExists: (filePath) =>
          execAsync("remote fileExists", false, async () => {
            const stats = await remote.connection.sftp.stat(filePath);
            return stats && stats.isFile();
          }),
        readFileText: (filePath, { ignoreErrors }) =>
          execAsync("remote readFileText", ignoreErrors, async () => {
            return await remote.connection.sftp.readFile(filePath, "utf8");
          }),
        readFileBuffer: (filePath, { ignoreErrors }) =>
          execAsync("remote readFileBuffer", ignoreErrors, async () => {
            throw new Error("not implemented");
          }),
        writeFileText: (filePath, contents, { ignoreErrors }) =>
          execAsync("remote readFileText", ignoreErrors, async () => {
            await remote.connection.sftp.writeFile(filePath, contents, null);
          }),

        // other
        exec: (command, { ignoreErrors }) =>
          execAsync("remote exec", ignoreErrors, async () => {
            try {
              const result = await remote.connection.ssh.exec(command, [], null);
              return { stdout: result, stderr: null };
            } catch (err) {
              return { stdout: null, stderr: err };
            }
          }),
      },
    };
    return vm.createContext(context);
  }
}

export interface ContextItem {
  name: string;
  summary: string;
  item: any;
}

export interface ScriptExecutionResult {
  success: boolean;
  error: string;
}
