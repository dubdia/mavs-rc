import { typedIpcMain, typedIpcRenderer } from "./ipc/ipc-api";
import { contextBridge, ipcRenderer } from "electron";
//const { contextBridge, ipcRenderer } = require("electron");


// expose ipc
contextBridge.exposeInMainWorld("api", {
  ipcRenderer: {
    on(...args: Parameters<typeof ipcRenderer.on>) {
      const [channel, listener] = args;
      return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
      const [channel, ...omit] = args;
      return ipcRenderer.off(channel, ...omit);
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
      const [channel, ...omit] = args;
      return ipcRenderer.send(channel, ...omit);
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
      const [channel, ...omit] = args;
      return ipcRenderer.invoke(channel, ...omit);
    },
  },
});

const exposedApi = {
  ipcRenderer: typedIpcRenderer,
  ipcMain: typedIpcMain,
};

// create strongly typed window.api that can be used in the renderer to access IPC commands
declare global {
  interface Window {
    api: typeof exposedApi;
  }
}
