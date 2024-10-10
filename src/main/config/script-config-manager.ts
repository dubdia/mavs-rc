import { RemotesConfig } from "./remotes-config";
import { ConfigManager } from "./config-manager";
import { ScriptsConfig } from "./scripts-config";

/** service for managing the remotes configuration */
export class ScriptConfigManager extends ConfigManager<ScriptsConfig> {
  constructor() {
    super("rc-scripts.config.json");
  }

  protected getDefault(): ScriptsConfig {
    return new ScriptsConfig();
  }
  protected normalize(config: ScriptsConfig) {
    if (config.scripts == null) {
      config.scripts = [];
    }
  }
}
