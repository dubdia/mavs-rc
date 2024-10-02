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
    if (config.logLevel == null || (config.logLevel as any) == "") {
      config.logLevel = "info";
    }
    if (config.devTools == null || (config.devTools as any) == "") {
      config.devTools = false;
    }
  }
}
