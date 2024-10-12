import { EntityState } from "@reduxjs/toolkit";
import { ScriptInfo } from "../../main/models/Script";
import { RemoteShellDto } from "../../shared/models/RemoteShellDto";
import Xterm from "../components/XTerm";

/** contains a list of all scripts */
export type ShellList = {
  /** whether scripts are loading */
  loading: boolean;

  /** id of the shell that is currently beeing viewed */
  selectedShellId: string | null;

  initializedFirstShell: boolean,

  /** all the shells */
  data: EntityState<ShellEntry, string>;
};

export type ShellEntry = {
  /** id of the shell */
  shellId: string;

  /** the complete shell history */
  data: string[];
};

export function createShellEntry(shellDto: RemoteShellDto): ShellEntry {
  return <ShellEntry>{
    shellId: shellDto.shellId,
    data: [],
  };
}
