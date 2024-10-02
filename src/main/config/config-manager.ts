import { app } from "electron";
import log from "electron-log/main";

import * as fs from "fs";
import * as path from "path";

/** base class for managing configuration files in the user-data directory */
export abstract class ConfigManager<TConfig> {
  public configFilePath!: string;
  public config!: TConfig;

  constructor(fileName: string) {
    const userDataPath = app.getPath("userData");
    this.configFilePath = path.join(userDataPath, fileName);
    this.init();
  }

  protected abstract getDefault(): TConfig;
  protected abstract normalize(config: TConfig): void;

  private init() {
    if (!fs.existsSync(this.configFilePath)) {
      // create new
      log.info(`Create new configuration file ${this.configFilePath}`);
      const config = this.getDefault();
      this.normalizeAndSave(config);
      this.config = config;
    } else {
      // load
      log.info(`Load config from ${this.configFilePath}`);
      const json = fs.readFileSync(this.configFilePath, "utf-8") ?? '';

      // parse or create new
      let config = JSON.parse(json);
      if(config == null) {
        config = this.getDefault();
      }

      // normalize and re-write to file if something has changed
      this.normalize(config);
      if (this.stringifyConfig(config) !== json) {
        log.info(`Write normalized config back to file ${this.configFilePath}`);
        this.normalizeAndSave(config);
      }

      this.config = config;
    }
  }
  public saveConfig() {
    log.info("Save config to " + this.configFilePath);
    this.normalizeAndSave(this.config);
  }

  private normalizeAndSave(config: TConfig) {
    this.normalize(config);
    fs.writeFileSync(this.configFilePath, this.stringifyConfig(config));
  }
  private stringifyConfig(config: TConfig) {
    return JSON.stringify(config, null, 2);
  }
}
