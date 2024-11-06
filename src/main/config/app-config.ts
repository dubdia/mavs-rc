import { LogLevel } from "electron-log";

/** configuration of the app (stored in file-system) */
export class AppConfig {
  /** log level for the application */
  logLevel: LogLevel = "info";

  /** whether to log ssh traffic as verbose (set logLevel to verbose to see it)  */
  logSsh: boolean = false;

  /** whether to open dev tools at start */
  devTools: boolean = false;

  /** directory where the scripts are saved. Leave empty for default directory in home */
  scriptsDir: string = ''
}
