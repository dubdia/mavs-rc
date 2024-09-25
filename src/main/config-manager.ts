import { app } from "electron";
import log from 'electron-log/main';

import * as fs from "fs";
import * as path from "path";
import { Config } from "./models/Config";

/** used to save and load the @see Config from the file-system */
export class ConfigManager {
  public configFilePath!: string;
  public config!: Config;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.configFilePath = path.join(userDataPath, "sshServers.json");
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.configFilePath)) {
      // create new
      log.info('Create new Config under ' + this.configFilePath);
      this.config = new Config();
      this.normalize();
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config));
    } else {
      // load
      log.info('Load config from ' + this.configFilePath);
      this.config = JSON.parse(fs.readFileSync(this.configFilePath, "utf-8"));
      this.normalize();
    }
  }

  private normalize() {
    if(this.config == null) {
      this.config = new Config();
      this.config.logLevel = 'info';
    }
    if(this.config.logLevel == null || (this.config.logLevel as any) == '') {
      this.config.logLevel = 'info';
    }
    if(this.config.remoteInfos == null) {
      this.config.remoteInfos = [];
    }
  }

  public saveConfig() {
    log.info('Save config to ' + this.configFilePath);
    fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));
  }
}

