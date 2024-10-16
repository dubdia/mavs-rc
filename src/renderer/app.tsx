import { createRoot } from "react-dom/client";
import { Background } from "./components/Background";
import { AppProvider } from "./providers/appProvider";
import Body from "./body";
import { appendScriptLog, appendShellData, loadRemotes, sessionDestroyShell } from "./store/remotesSlice";
import { store } from "./store/store";

// render react on root element
const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyWindow = window as any;
if (anyWindow.rootInstance == null) {
  anyWindow.rootInstance = createRoot(root);
}
anyWindow.rootInstance.render(<App />);

// setup consts
export const ipc = window.api.ipcRenderer;
if (ipc == null) {
  throw new Error("Unable to get IPC Renderer");
}

// register to events
ipc.on("shellReceive", (_, id, shellId, data) => {
  if (data == null || data.length == 0) {
    return;
  }
  store.dispatch(appendShellData({ id: id, shellId: shellId, data: data }));
});
ipc.on("disposeRemote", (_, _id) => {
  console.log("A remote was disposed. Reload remotes now");
  store.dispatch(loadRemotes());
});
ipc.on("disposeShell", (_, id, shellId) => {
  console.log("A shell was disposed. Remove it now");
  store.dispatch(sessionDestroyShell({ id: id, shellId: shellId, onlyRemoveFromRenderer: true }));
});
ipc.on("scriptLog", (_, id, scriptId, message) => {
  store.dispatch(appendScriptLog({ id: id, scriptId: scriptId, message: message }));
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
