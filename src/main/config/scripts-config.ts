import { RemoteInfo } from "../../shared/models/RemoteInfo";
import { Script, ScriptInfo } from "../models/Script";

/** configuration of the remotes (stored in file-system) */
export class ScriptsConfig {
  scripts: ScriptInfo[] = [];
}