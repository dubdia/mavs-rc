import { RemotesConfig } from "./remotes-config";
import { ConfigManager } from "./config-manager";

/** service for managing the remotes configuration */
export class RemotesConfigManager extends ConfigManager<RemotesConfig> {
  constructor() {
    super("rc-remotes.config.json");
  }

  protected getDefault(): RemotesConfig {
    return new RemotesConfig();
  }
  protected normalize(config: RemotesConfig) {
    if (config.remoteInfos == null) {
      config.remoteInfos = [];
    }
  }
}
