import { LogLevel } from "electron-log";

/** configuration of the app (stored in file-system) */
export class AppConfig {
  /** log level for the application */
  logLevel: LogLevel = "info";

  /** whether to open dev tools at start */
  devTools: boolean = false;
}
