import { LogLevel } from "electron-log";
import { RemoteInfo } from "../../shared/models/RemoteInfo";

/** the configuration model - this model is saved as json in the file-system for persistant storage */
export class Config {
  remoteInfos: RemoteInfo[];
  logLevel: LogLevel;
}
