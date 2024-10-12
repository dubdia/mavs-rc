import { EntityState } from "@reduxjs/toolkit";
import { ScriptInfo } from "../../main/models/Script";
import { RemoteShellDto } from "../../shared/models/RemoteShellDto";

/** contains a list of all scripts */
export type ShellList = {
  /** whether scripts are loading */
  loading: boolean;

  /** id of the shell that is currently beeing viewed */
  selectedShellId: string | null;

  /** all the shells */
  data: EntityState<ShellEntry, string>;
};

export type ShellEntry = {
  /** id of the shell */
  shellId: string;

  /** the complete shell history */
  data: string[];

  /** name */
  name: string;
};

export function createShellEntry(shellDto: RemoteShellDto): ShellEntry {
  return <ShellEntry>{
    shellId: shellDto.shellId,
    data: [],
    name: "shell-" + new Date().getTime().toString(), //todo
  };
}
