import { EntityState } from "@reduxjs/toolkit";
import { ScriptInfo } from "../../main/models/Script";

/** contains a list of all scripts */
export type ScriptList = {
  /** whether scripts are loading */
  loading: boolean;

  /** id of the tunnel that is currently beeing edited */
  editScriptName: string | null;

  /** all the scripts */
  data: EntityState<ScriptEntry, string>;

  /** default sizes of the panes */
  sizes: number[];
};


export type ScriptTab = "problems" | "logs";

export type ScriptEntry = ScriptInfo & {
  running: boolean;
  log: ScriptLog[];
  selectedTab: ScriptTab;
}


export type ScriptLog = {
  timestamp: number; //ms since 1970
  message: string;
  params: string[];
}


export function createScriptEntry(scriptInfo: ScriptInfo): ScriptEntry {
  return  <ScriptEntry>{
    contents: scriptInfo.contents,
    name: scriptInfo.name,
    running: false,
    log: [],
    selectedTab: 'problems',
  }
}