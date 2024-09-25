import { PayloadAction, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createFile, SessionFile } from "../models/SessionFile";
import { SessionService } from "../models/SessionService";
import { TabName } from "../models/TabName";
import { createRemote, Remote } from "../models/Remote";
import { createAsync } from "../utils/createAsync";
import { toast } from "react-toastify";
import { replaceAll } from "../../shared/utils/replaceAll";
import { getFileTabName } from "../utils/getFileTabName";
import { ipc } from "../app";
import { RemoteInfo } from "../../shared/models/RemoteInfo";
import { RemoteShortcut } from "../../shared/models/RemoteShortcut";
import { RemoteFile } from "../../shared/models/RemoteFile";
import { RemoteTunnelDto } from "../../shared/models/RemoteTunnelDto";
import { RemoteTunnelInfo } from "../../shared/models/RemoteTunnelInfo";
import { processList, ProcessableListParams } from "../models/ProcessableList";
import { createRemoteSession } from "../models/Session";
import { State } from "../models/State";

export const loadRemotes = createAsync("loadRemotes", async () => await ipc.invoke("listRemotes"), {
  onPending: (state: State) => {
    state.dataStatus = "pending";
  },
  onRejected: (state, error) => {
    state.dataStatus = "rejected";
    state.dataError = error.message ?? "Unkown error occured";
    toast.error("Error loading remotes");
  },
  onFulfilled: (state, data) => {
    state.dataStatus = "fulfilled";

    // remove all unknown remotes
    const remotesToRemove = state.data.ids.filter((id) => data.find((x) => x.info.id == id) == null);
    if (remotesToRemove && remotesToRemove.length > 0) {
      remotesAdapter.removeMany(state.data, remotesToRemove);
    }

    // add the one that are new
    const remotesToAdd = data.filter((x) => state.data.ids.find((id) => x.info.id == id) == null);
    if (remotesToAdd && remotesToAdd.length > 0) {
      remotesAdapter.addMany(
        state.data,
        remotesToAdd.map((x) => createRemote(x))
      );
    }

    // update
    for (let remoteId of state.data.ids) {
      const localRemote = state.data.entities[remoteId];
      const otherRemote = data.find((x) => x.info.id == remoteId);

      // update info
      localRemote.dto = otherRemote;

      // remove session when not connected
      if (!otherRemote.connected) {
        // recreate session
        localRemote.session = createRemoteSession(localRemote.dto);
      }
    }

    // restore active
    const activeId = localStorage.getItem("active-id");
    if (activeId && state.data.ids.find((id) => id == activeId)) {
      state.activeId = activeId;
    } else if (state.data.ids.length > 0) {
      state.activeId = state.data.ids[0];
    } else {
      state.activeId = null;
    }
  },
});
export const createNewRemote = createAsync("createNewRemote", async () => await ipc.invoke("createRemote"), {
  onRejected: (_state: State) => {
    toast.error("An error occured while creating");
  },
  onFulfilled: (state: State, data) => {
    state.dataStatus = "fulfilled";
    const remote = createRemote(data);
    remotesAdapter.addOne(state.data, remote);
    state.activeId = remote.id;
    toast.success("Remote created");
  },
});
export const removeRemote = createAsync("removeRemote", async (id: string) => await ipc.invoke("deleteRemote", id), {
  onRejected: (_state: State) => {
    toast.error("An error occured while removing");
  },
  onFulfilled: (state: State, _data, arg) => {
    state.dataStatus = "fulfilled";
    remotesAdapter.removeOne(state.data, arg!);
    if (state.activeId == arg && selectTotal(state) > 0) {
      state.activeId = selectAll(state)[0].id;
    }
    toast.success("Remote deleted");
  },
});
export const updateRemote = createAsync(
  "updateRemote",
  async (remoteInfo: RemoteInfo) => await ipc.invoke("updateRemote", remoteInfo),
  {
    onRejected: (_state: State) => {
      toast.error("An error occured while updating");
    },
    onFulfilled: (state: State, _data, arg) => {
      state.data.entities[arg?.id!].dto.info = arg;
      toast.success("Remote updated");
    },
  }
);
export const connectRemote = createAsync("connectRemote", async (id: string) => await ipc.invoke("connectRemote", id), {
  onPending: (state: State, arg) => {
    state.data.entities[arg!].session.loading = true;
  },
  onRejected: (state: State, _error, arg) => {
    state.data.entities[arg!].session.loading = false;
    toast.error("An error occured while connecting");
  },
  onFulfilled: (state: State, data, arg) => {
    const s = state.data.entities[arg!];
    s.session.loading = false;

    if (data.success) {
      s.dto = data.remote;
    } else {
      toast.error(data.error ?? "An error occured while connecting");
    }
  },
});
export const closeRemote = createAsync("closeRemote", async (id: string) => await ipc.invoke("disconnectRemote", id), {
  onPending: (state: State, arg) => {
    state.data.entities[arg!].session.loading = true;
  },
  onRejected: (state: State, _error, arg) => {
    state.data.entities[arg!].session.loading = false;
    toast.error("An error occured while closing the connection");
  },
  onFulfilled: (state: State, data, arg) => {
    state.data.entities[arg!].session.loading = false;
    // this should trigger the event "disposeRemote" which then just reloads the data
  },
});

/*
export const sessionExecuteCommand = createAsync(
  "sessionExecuteCommand",
  async (params: { id: string; command: string }) => await ipc.invoke("executeSshCommand", params.id, params.command),
  {
    onPending: (state: State, arg) => {
      const s = state.data.entities[arg?.id!].session;
      s.commandLoading = true;
    },
    onRejected: (state: State, error, arg) => {
      const s = state.data.entities[arg?.id!].session;
      s.commandLoading = false;
      s.commandResult = null;
      toast.error("An error occured while executing the command: " + error.message);
    },
    onFulfilled: (state: State, data, arg) => {
      const s = state.data.entities[arg?.id!].session;
      s.commandLoading = false;
      s.commandResult = data;
    },
  }
);*/
export const sessionFetchServices = createAsync(
  "sessionFetchServices",
  async (id: string) => {
    // get services
    const command = 'systemctl --type=service --all | grep ".service" | awk \'{print $1 "|" $2 "|" $3 "|" $4}\'';
    const result = await ipc.invoke("executeSshCommand", id, command);
    if (result == null || !result.success || !result.output) {
      throw "Unable to fetch services: " + result.output;
    }

    // map to model
    let text = result.output;
    if (text == null || text == "") {
      return [];
    }
    text = replaceAll(text, "●|").trim();
    let lines = text
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 3);
    let mappedServices = lines.map((line) => {
      const parts = line.split("|");
      const service = {
        name: parts[0],
        load: parts[1],
        active: parts[2],
        sub: parts[3],
      } as SessionService;
      return service;
    });

    // filter
    const pass = (name: string) => {
      if (name.startsWith("system-")) {
        return false;
      }
      if (name.startsWith("systemd-")) {
        return false;
      }
      return true;
    };
    mappedServices = mappedServices.filter((x) => pass(x.name));
    return mappedServices;
  },
  {
    onPending: (state: State, arg) => {
      const s = state.data.entities[arg!].session.services;
      s.loading = true;
    },
    onRejected: (state: State, error, arg) => {
      const s = state.data.entities[arg!].session.services;
      s.loading = false;
      processList(s, { original: [] });
      if (error && typeof error === "string" && error != "") {
        toast.error(error);
      } else {
        toast.error("An error occured while loading the services");
      }
    },
    onFulfilled: (state: State, data, arg) => {
      const s = state.data.entities[arg!].session.services;
      s.loading = false;
      processList(s, { original: data });
    },
  }
);

export const sessionList = createAsync(
  "sessionList",
  async (params: { id: string; path: string; clearFilter?: boolean }) => {
    return await ipc.invoke("listDirectory", params.id, params.path);
  },
  {
    onPending: (state: State, arg) => {
      const s = state.data.entities[arg?.id!].session.explorer;
      s.loading = true;
    },
    onRejected: (state: State, _error, arg) => {
      const s = state.data.entities[arg?.id!].session.explorer;
      s.loading = false;
      processList(s, { original: [] });
      toast.error("An error occured while loading the services");
    },
    onFulfilled: (state: State, data, arg) => {
      const s = state.data.entities[arg?.id!].session.explorer;
      s.loading = false;
      s.dir = arg?.path ?? "/";
      if (arg?.clearFilter === true) {
        processList(s, { searchText: "" });
      }
      processList(s, { original: data });
    },
  }
);

export const sessionAddShortcut = createAsync(
  "sessionAddShortcut",
  async (params: { id: string; shortcut: RemoteShortcut }) => {
    const result = await ipc.invoke("createShortcut", params.id, params.shortcut);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while adding the shortcut");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      session.shortcuts.shortcuts = data ?? [];
    },
  }
);
export const sessionRemoveShortcuts = createAsync(
  "sessionRemoveShortcut",
  async (params: { id: string; shortcut: RemoteShortcut }) => {
    const result = await ipc.invoke("removeShortcut", params.id, params.shortcut);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while deleting the shortcut");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      session.shortcuts.shortcuts = data ?? [];
    },
  }
);

export const sessionFetchTunnels = createAsync(
  "sessionFetchTunnels",
  async (id: string) => ipc.invoke("listTunnels", id),
  {
    onPending: (state: State, arg) => {
      const s = state.data.entities[arg!].session.tunnels;
      s.loading = true;
    },
    onRejected: (state: State, _error, arg) => {
      const s = state.data.entities[arg!].session.tunnels;
      s.loading = false;
      processList(s, { original: [] });
      toast.error("An error occured while loading the tunnels");
    },
    onFulfilled: (state: State, data, arg) => {
      const s = state.data.entities[arg!].session.tunnels;
      s.loading = false;
      processList(s, { original: data });
    },
  }
);
export const sessionCreateTunnel = createAsync(
  "sessionCreateTunnel",
  async (params: { id: string; tunnelName: string }) => {
    const result = await ipc.invoke("createTunnel", params.id, params.tunnelName);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while updating the tunnel");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      processList(session.tunnels, { original: data });
    },
  }
);
export const sessionUpdateTunnel = createAsync(
  "sessionUpdateTunnel",
  async (params: { id: string; tunnel: RemoteTunnelInfo }) => {
    const result = await ipc.invoke("updateTunnel", params.id, params.tunnel);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while updating the tunnel");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      processList(session.tunnels, { original: data });
      session.tunnels.editTunnelId = null;
    },
  }
);
export const sessionRemoteTunnel = createAsync(
  "sessionRemoveTunnel",
  async (params: { id: string; tunnelId: string }) => {
    const result = await ipc.invoke("removeTunnel", params.id, params.tunnelId);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while removing the tunnel");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      processList(session.tunnels, { original: data });
    },
  }
);
export const sessionConnectTunnel = createAsync(
  "sessionConnectTunnel",
  async (params: { id: string; tunnelId: string }) => {
    const result = await ipc.invoke("connectTunnel", params.id, params.tunnelId);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while connecting the tunnel");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      processList(session.tunnels, { original: data });
    },
  }
);
export const sessionDestroyTunnel = createAsync(
  "sessionDestroyTunnel",
  async (params: { id: string; tunnelId: string }) => {
    const result = await ipc.invoke("disconnectTunnel", params.id, params.tunnelId);
    return result;
  },
  {
    onRejected: (_state: State, _error, _arg) => {
      toast.error("An error occured while destroying the tunnel");
    },
    onFulfilled: (state: State, data, arg) => {
      const session = state.data.entities[arg?.id!].session;
      processList(session.tunnels, { original: data });
    },
  }
);

// create adapter for managing the remotes array
const remotesAdapter = createEntityAdapter<Remote, string>({
  selectId: (remote) => remote!.id!,
  sortComparer: (a, b) => (a?.dto?.info?.name ?? "").localeCompare(b.dto?.info?.name ?? ""),
});
export const { selectIds, selectEntities, selectAll, selectTotal } = remotesAdapter.getSelectors<State>(
  (state) => state.data
);

// create initial state
const initialState = {
  auth: {
    loggedIn: false,
    tokenSecret: null,
    loading: false,
    restoring: "idle",
  },
  data: remotesAdapter.getInitialState(),
  dataError: null,
  dataStatus: "new",
  activeId: null,
} as State;

// create slice
type PayloadID = PayloadAction<{ id: string }>;
export const appSlice = createSlice({
  name: "remotes",
  initialState,
  reducers: {
    /** remotes: remotes all remotes from the CLIENT */
    clear: (state) => {
      remotesAdapter.removeAll(state.data);
    },
    setActiveId: (state, action: PayloadID) => {
      localStorage.setItem("active-id", action.payload.id);
      state.activeId = action.payload.id;
    },
    setSelectedTab: (state, action: PayloadAction<{ id: string; key: TabName }>) => {
      state.data.entities[action.payload.id].session.selectedTab = action.payload.key;
    },

    /*
    setSessionCommand: (state, action: PayloadAction<{ id: string; command: string }>) => {
      state.data.entities[action.payload.id].session.command = action.payload.command;
    },*/
    closeSessionFile: (state, action: PayloadAction<{ id: string; filePath: string }>) => {
      const s = state.data.entities[action.payload.id].session;
      const file = s.files.find((x) => x.filePath == action.payload.filePath);
      if (file != null) {
        s.files = s.files.filter((x) => x !== file);
        if (file.onCloseNavigateBackTo != null && (file.onCloseNavigateBackTo as any) != "") {
          s.selectedTab = file.onCloseNavigateBackTo;
        } else {
          s.selectedTab = "services";
        }
      }
    },
    addSessionFile: (state, action: PayloadAction<{ id: string; file: SessionFile; select: boolean }>) => {
      const s = state.data.entities[action.payload.id].session;
      s.files.push(action.payload.file);
      if (action.payload.select == true) {
        s.selectedTab = action.payload.file.tab;
      }
    },
    selectSessionFile: (state, action: PayloadAction<{ id: string; file: SessionFile }>) => {
      const s = state.data.entities[action.payload.id].session;
      s.selectedTab = action.payload.file.tab;
    },
    changeSessionFile: (
      state,
      action: PayloadAction<{ id: string; fileTab: TabName; func: (file: SessionFile) => void }>
    ) => {
      const s = state.data.entities[action.payload.id].session;
      const f = s.files.find((x) => x.tab == action.payload.fileTab);
      if (f != null && action.payload.func != null) {
        action.payload.func(f);
      }
    },

    processSessionServices: (
      state,
      action: PayloadAction<{ id: string; params: ProcessableListParams<SessionService> }>
    ) => {
      const session = state.data.entities[action.payload.id].session;
      processList(session.services, action.payload.params);
    },
    processSessionExplorer: (
      state,
      action: PayloadAction<{ id: string; params: ProcessableListParams<RemoteFile> }>
    ) => {
      const session = state.data.entities[action.payload.id].session;
      processList(session.explorer, action.payload.params);
    },
    processSessionTunnels: (
      state,
      action: PayloadAction<{ id: string; params: ProcessableListParams<RemoteTunnelDto> }>
    ) => {
      const session = state.data.entities[action.payload.id].session;
      processList(session.tunnels, action.payload.params);
    },
    editSessionTunnel: (state, action: PayloadAction<{ id: string; editTunnelId: string | null }>) => {
      const session = state.data.entities[action.payload.id].session;
      session.tunnels.editTunnelId = action.payload.editTunnelId;
    },
    changeSessionTunnel: (
      state,
      action: PayloadAction<{ id: string; tunnelId: string; func: (tunnel: RemoteTunnelDto) => void }>
    ) => {
      const s = state.data.entities[action.payload.id].session;
      const t = s.tunnels.original.find((x) => x.info?.id == action.payload.tunnelId);
      if (t != null && action.payload.func != null) {
        action.payload.func(t);
        processList(s.tunnels, { original: s.tunnels.original });
      }
    },

    appendShellData: (state, action: PayloadAction<{ id: string; data: string }>) => {
      const session = state.data.entities[action.payload.id].session;
      session.shell.data.push(action.payload.data ?? "");
    },
  },
  extraReducers: (builder) => {
    loadRemotes.register(builder);
    createNewRemote.register(builder);
    removeRemote.register(builder);
    updateRemote.register(builder);
    connectRemote.register(builder);
    closeRemote.register(builder);

    sessionAddShortcut.register(builder);
    sessionRemoveShortcuts.register(builder);

    //sessionExecuteCommand.register(builder);
    sessionFetchServices.register(builder);

    sessionList.register(builder);

    sessionCreateTunnel.register(builder);
    sessionUpdateTunnel.register(builder);
    sessionRemoteTunnel.register(builder);
    sessionFetchTunnels.register(builder);
    sessionConnectTunnel.register(builder);
    sessionDestroyTunnel.register(builder);

    // this is for us developers
    builder.addDefaultCase((_state, action) => {
      if (action.type == null || !action.type.startsWith("@@redux")) {
        console.error("This AsyncThunk is not mapped!", action);
      }
    });
  },
});

export const {
  clear,
  setActiveId,
  setSelectedTab,
  //setSessionCommand,
  closeSessionFile,
  addSessionFile,
  changeSessionFile,
  selectSessionFile,
  processSessionServices,
  processSessionExplorer,
  processSessionTunnels,
  appendShellData,
  editSessionTunnel,
  changeSessionTunnel,
} = appSlice.actions;
export default appSlice.reducer;
