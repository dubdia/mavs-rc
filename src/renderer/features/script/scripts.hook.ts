import { toast } from "react-toastify";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { useInput } from "../../components/dialogs/InputDialog";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import {
  sessionCreateScript,
  sessionDeleteScript,
  selectScript as selectScriptLib,
  sessionUpdateScript,
  sessionExecuteScript,
  selectAllScripts,
  selectScriptById,
  setScriptTab,
  setScriptsSizes,
  clearScriptLog,
  appendScriptLog,
} from "../../store/remotesSlice";
import { ScriptTab } from "../../models/ScriptList";

export const useScripts = (id: string) => {
  const input = useInput();
  const appDispatch = useAppDispatch();
  const confirm = useConfirm();
  const defaultSizes = useRemoteSelector(id, (remote) => remote.session.scripts.sizes);
  const scripts = useRemoteSelector(id, (remote) => selectAllScripts(remote.session));
  const script = useRemoteSelector(id, (remote) =>
    selectScriptById(remote.session, remote.session.scripts.editScriptName)
  );

  const addScript = async () => {
    try {
      let nameOk = false;
      let name: string = null;
      while (!nameOk) {
        // get name from user
        name = await input({
          title: "Add new script",
          message: "Enter name of the script",
          yes: "Create",
        });
        name = name?.trim();

        // check if name was entered
        if (name == null || name == "") {
          return;
        }

        // check name
        if (scripts.find((x) => x.name.trim().toLowerCase() == name.toLowerCase())) {
          toast.warn("A script with that name already exists");
        } else if (name.length > 64) {
          toast.warn("Name of the script is too long");
        } else {
          nameOk = true;
        } //todo check for invalid chars
      }

      await appDispatch(sessionCreateScript({ id: id, scriptName: name }));
      toast.success("Created " + name);
    } catch (err) {
      console.error("failed to create script", err);
      toast.error("Failed to create new script");
    }
  };
  const removeScript = async (name: string) => {
    const scriptById = scripts.find((x) => x.name == name);
    if (scriptById == null || scriptById.name == null) {
      return;
    }
    try {
      // confirm
      const ok = await confirm({
        title: "Delete Script " + scriptById.name + "?",
        yes: "Delete",
      });
      if (ok !== true) {
        return;
      }

      // remove
      await appDispatch(sessionDeleteScript({ id: id, name: scriptById.name }));
      toast.success("Deleted " + scriptById.name);
    } catch (err) {
      console.error("failed to delete script", script, err);
      toast.error("Failed to delete");
    }
  };
  const selectScript = (name: string) => {
    appDispatch(selectScriptLib({ id: id, name: name }));
  };
  const saveScript = async (name: string) => {
    // get script
    const scriptById = scripts.find((x) => x.name == name);
    if (scriptById == null) {
      return;
    }
    // try to save
    try {
      // save current
      await appDispatch(sessionUpdateScript({ id: id, name: scriptById.name, contents: scriptById.contents }));
      toast.success("Script saved");
    } catch (err) {
      console.error("failed to save script", err);
      toast.error("Failed to save script: " + err?.toString());
    }
  };
  const saveAndExecuteScript = async (name: string) => {
    // get script
    const scriptById = scripts.find((x) => x.name == name);
    if (scriptById == null) {
      return;
    }

    // try to execute
    try {
      // check
      if (scriptById.contents == "") {
        toast.warn("Your script seems empty!");
        return;
      }

      // clear log and append message that script will be starting
      appDispatch(clearScriptLog({ id: id, name: scriptById.name }));
      appDispatch(
        appendScriptLog({
          id: id,
          name: scriptById.name,
          scriptLog: {
            timestamp: new Date().getTime(),
            message: "Start script",
            params: [scriptById.name],
          },
        })
      );

      // save current
      await appDispatch(sessionUpdateScript({ id: id, name: scriptById.name, contents: scriptById.contents }));
      // execute
      await appDispatch(sessionExecuteScript({ id: id, name: scriptById.name }));
    } catch (err) {
      console.error("failed to execute script", err);
      toast.error("Failed to execute script: " + err?.toString());
      appDispatch(
        appendScriptLog({
          id: id,
          name: scriptById.name,
          scriptLog: {
            timestamp: new Date().getTime(),
            message: "Failed to execute script",
            params: [err?.toString()],
          },
        })
      );
    }
  };
  const selectTab = (name: string, tab: ScriptTab) => {
    appDispatch(setScriptTab({ id: id, name: name, tab: tab }));
  };
  const setSizes = (sizes: number[]) => {
    appDispatch(setScriptsSizes({ id: id, sizes: sizes }));
  };
  const clearLog = (name: string) => {
    // get script
    const scriptById = scripts.find((x) => x.name == name);
    if (scriptById == null) {
      return;
    }
    clearScriptLog({ id: id, name: scriptById.name });
  };

  return {
    script,
    scripts,
    defaultSizes,
    addScript,
    removeScript,
    selectScript,
    saveScript,
    saveAndExecuteScript,
    selectTab,
    setSizes,
    clearLog,
  };
};
