import { SessionShell } from "./SessionShell";
import { SessionFile } from "./SessionFile";
import { SessionExplorer } from "./SessionExplorer";
import { SessionServices } from "./SessionServices";
import { SessionShortcuts } from "./SessionShortcuts";
import { SessionTunnel } from "./SessionTunnel";
import { TabName } from "./TabName";
import { RemoteDto } from "../../shared/models/RemoteDto";
import { ScriptList } from "./ScriptList";
import { EntityState } from "@reduxjs/toolkit";
import { ScriptInfo } from "../../main/models/Script";
import { scriptsAdapter, shellsAdapter } from "../store/remotesSlice";
import { ShellList } from "./ShellList";

/** state information about a connected remote */

export type Session = {
  /** the current selected tab */
  selectedTab: TabName;

  /** whether something is loading */
  loading: boolean;

  /** information about the shell */
  shells: ShellList;

  /** information about the services */
  services: SessionServices;

  /** information about the explorer / finder */
  explorer: SessionExplorer;

  /** shortcuts */
  shortcuts: SessionShortcuts;

  /** tunnels */
  tunnels: SessionTunnel;

  /** scripts */
  scripts: ScriptList;

  /** the currently opened files */
  files: SessionFile[];
};

/** factory function to create a new @see Session for given @param dto */
export const createRemoteSession = (dto: RemoteDto) =>
  <Session>{
    selectedTab: "info",
    loading: false,

    services: {
      searchColumn: "name",
      searchText: "",
      filtered: [],
      original: [],
      filters: [{ column: "active", value: "inactive", operator: "notEquals" }],
      sortDescriptor: {
        column: "name",
        direction: "ascending",
      },

      loading: false,
    },

    explorer: {
      searchColumn: "name",
      searchText: "",
      filtered: [],
      original: [],
      sortDescriptor: {
        column: "name",
        direction: "ascending",
      },
      filters: [],
      dir: "/",
      loading: false,
    },

    tunnels: {
      searchColumn: "name",
      searchText: "",
      filtered: [],
      original: [],
      sortDescriptor: {
        column: "name",
        direction: "ascending",
      },
      filters: [],
      loading: false,
      editTunnelId: null,
    },
    scripts: {
      loading: false,
      editScriptId: null,
      data: scriptsAdapter.getInitialState(),
    },

    shells: {
      loading: false,
      selectedShellId: null,
      initializedFirstShell: false,
      data: shellsAdapter.getInitialState(),
    },

    shortcuts: {
      shortcuts: dto.info?.shortcuts ?? [],
      loading: false,
    },

    files: [],
  };
