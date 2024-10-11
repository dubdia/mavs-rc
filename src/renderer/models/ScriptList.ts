import { EntityState } from "@reduxjs/toolkit";
import { ScriptInfo } from "../../main/models/Script";

/** contains a list of all scripts */
export type ScriptList = {
  /** whether scripts are loading */
  loading: boolean;

  /** id of the tunnel that is currently beeing edited */
  editScriptId: string | null;

  /** all the scripts */
  data: EntityState<ScriptEntry, string>;
};

export type ScriptEntry = ScriptInfo & {
  running: boolean;
  log: string[];
}


export function createScriptEntry(scriptInfo: ScriptInfo): ScriptEntry {
  return  <ScriptEntry>{
    scriptId: scriptInfo.scriptId,
    content: scriptInfo.content,
    name: scriptInfo.name,
    running: false,
    log: [],
  }
}