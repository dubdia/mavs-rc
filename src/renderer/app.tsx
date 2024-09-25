import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Background } from "./components/Background";
import { AppProvider } from "./providers/appProvider";
import Body from "./body";
import { appendShellData, loadRemotes } from "./store/remotesSlice";
import { store } from "./store/store";
import { toast } from "react-toastify";

// render react on root element
const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

const anyWindow = window as any;
if (anyWindow.rootInstance == null) {
  anyWindow.rootInstance = createRoot(root);
}
anyWindow.rootInstance.render(<App />);

// calling IPC exposed from preload script
setTimeout(async () => {
  /*window.api.on.showAlert((_event, text) => {
    alert(text);
  });*/
}, 2000);

// setup consts
export const ipc = window.api.ipcRenderer;
if (ipc == null) {
  throw new Error("Unable to get IPC Renderer");
}

// register to events
ipc.on("shellReceive", (_, id, data) => {
  if (data == null || data.length == 0) {
    return;
  }
  store.dispatch(appendShellData({ id: id, data: data }));
});
ipc.on("disposeRemote", (_, id) => {
  console.log('A remote was disposed. Reload remotes now');
  store.dispatch(loadRemotes());
});

// the app
export default function App() {
  return (
    <AppProvider>
      <Background></Background>
      <Body></Body>
    </AppProvider>
  );
}
