import { AppConfig } from "./app-config";
import { ConfigManager } from "./config-manager";

/** service for managing the app configuration */
export class AppConfigManager extends ConfigManager<AppConfig> {
  constructor() {
    super("rc.config.json");
  }

  protected getDefault(): AppConfig {
    return new AppConfig();
  }
  protected normalize(config: AppConfig): void {
    if (config.logLevel == null || (config.logLevel?.toString()) == "") {
      config.logLevel = "info";
    }
    if (config.devTools == null || (config.devTools?.toString()) == "") {
      config.devTools = false;
    }
    if (config.logSsh == null || (config.logSsh?.toString()) == "") {
      config.logSsh = false;
    }
  }
}
