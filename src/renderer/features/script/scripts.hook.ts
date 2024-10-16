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
} from "../../store/remotesSlice";

export const useScripts = (id: string) => {
  const input = useInput();
  const appDispatch = useAppDispatch();
  const confirm = useConfirm();
  const scripts = useRemoteSelector(id, (remote) => selectAllScripts(remote.session));
  const script = useRemoteSelector(id, (remote) =>
    selectScriptById(remote.session, remote.session.scripts.editScriptId)
  );

  const getScripts = () => {
    return scripts;
  };
  const getCurrentScript = () => {
    return script;
  };
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
  const removeScript = async (scriptId: string) => {
    const scriptById = scripts.find((x) => x.scriptId == scriptId);
    if (scriptById == null || scriptById.scriptId == null) {
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
      await appDispatch(sessionDeleteScript({ id: id, scriptId: scriptById.scriptId }));
      toast.success("Deleted " + scriptById.name);
    } catch (err) {
      console.error("failed to delete script", script, err);
      toast.error("Failed to delete");
    }
  };
  const selectScript = (scriptId: string) => {
    appDispatch(selectScriptLib({ id: id, scriptId: scriptId }));
  };
  const saveScript = async (scriptId: string) => {
    // get script
    const scriptById = scripts.find((x) => x.scriptId == scriptId);
    if (scriptById == null) {
      return;
    }
    // try to save
    try {
      // save current
      await appDispatch(sessionUpdateScript({ id: id, script: scriptById }));
      toast.success("Script saved");
    } catch (err) {
      console.error("failed to save script", err);
      toast.error("Failed to save script: " + err?.toString());
    }
  };
  const saveAndExecuteScript = async (scriptId: string) => {
    // get script
    const scriptById = scripts.find((x) => x.scriptId == scriptId);
    if (scriptById == null) {
      return;
    }

    // try to execute
    try {
      // check
      if (scriptById.content == "") {
        toast.warn("Your script seems empty!");
        return;
      }

      // save current
      await appDispatch(sessionUpdateScript({ id: id, script: scriptById }));

      // execute
      await appDispatch(sessionExecuteScript({ id: id, scriptId: scriptById.scriptId }));
    } catch (err) {
      console.error("failed to execute script", err);
      toast.error("Failed to execute script: " + err?.toString());
    }
  };

  return {
    getScripts,
    getCurrentScript,
    addScript,
    removeScript,
    selectScript,
    saveScript,
    saveAndExecuteScript,
  };
};
