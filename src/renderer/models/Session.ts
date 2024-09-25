import { SessionShell } from "./SessionShell";
import { SessionFile } from "./SessionFile";
import { SessionExplorer } from "./SessionExplorer";
import { SessionServices } from "./SessionServices";
import { SessionShortcuts } from "./SessionShortcuts";
import { SessionTunnel } from "./SessionTunnel";
import { TabName } from "./TabName";
import { RemoteDto } from "../../shared/models/RemoteDto";

/** state information about a connected remote */

export type Session = {
  /** the current selected tab */
  selectedTab: TabName;

  /** whether something is loading */
  loading: boolean;

  /** information about the shell */
  shell: SessionShell;

  /** information about the services */
  services: SessionServices;

  /** information about the explorer / finder */
  explorer: SessionExplorer;

  /** shortcuts */
  shortcuts: SessionShortcuts;

  /** tunnels */
  tunnels: SessionTunnel;

  /** the currently opened files */
  files: SessionFile[];
};

/** factory function to create a new @see Session for given @param dto */
export const createRemoteSession = (dto: RemoteDto) =>
  <Session>{
    selectedTab: "info",
    loading: false,

    shell: {
      data: dto.shellHistory ?? [],
    },

    command: "",
    commandResult: null,
    commandLoading: false,

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

    shortcuts: {
      shortcuts: dto.info?.shortcuts ?? [],
      loading: false,
    },

    files: [],
  };
