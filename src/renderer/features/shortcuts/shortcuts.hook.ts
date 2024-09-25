import { toast } from "react-toastify";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { useInput } from "../../components/dialogs/InputDialog";
import {
  processSessionServices,
  sessionAddShortcut,
  sessionList,
  sessionRemoveShortcuts,
  setSelectedTab,
} from "../../store/remotesSlice";
import { useAppDispatch } from "../../store/store";
import { RemoteShortcut } from "../../../shared/models/RemoteShortcut";
import { RemoteShortcutType } from "../../../shared/models/RemoteShortcutType";
import { ipc } from "../../app";
import { useFiles } from "../files/files.hook";

export const useShortcuts = (id: string) => {
  const input = useInput();
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const files = useFiles(id);

  const newShortcut = async (value: string, type: RemoteShortcutType) => {
    if (value == null || type == null) {
      return;
    }
    try {
      // ask user for a name
      const name = await input({
        title: "Create Shortcut " + type,
        message: "Give your shortcut a name",
        initialValue: value,
        yes: "Create",
      });
      if (name == null) {
        return;
      }

      // add
      const shortcut: RemoteShortcut = {
        name: name ?? value,
        type: type,
        value: value,
      };
      dispatch(sessionAddShortcut({ id: id, shortcut: shortcut }));
      toast.success("Created " + name);
    } catch (err) {
      console.error("failed to create new file or folder", type, err);
      toast.error("Failed to create new " + type);
    }
  };
  const removeShortcut = async (shortcut: RemoteShortcut) => {
    if (shortcut == null) {
      return;
    }
    try {
      // confirm
      const ok = await confirm({
        title: "Delete Shortcut " + shortcut.name + "?",
        yes: "Delete",
      });
      if (ok !== true) {
        return;
      }

      // remove
      dispatch(sessionRemoveShortcuts({ id: id, shortcut: shortcut }));
      toast.success("Deleted " + shortcut.name);
    } catch (err) {
      console.error("failed to delete shortcut", shortcut, err);
      toast.error("Failed to delete");
    }
  };
  const executeShortcut = async (shortcut: RemoteShortcut) => {
    try {
      if (shortcut == null || shortcut.value == null || shortcut.value == "" || shortcut.type == null) {
        return;
      }
      switch (shortcut.type) {
        case "file": {
          // open dir in explorer or open file
          const file = await ipc.invoke("getFile", id, shortcut.value);
          if (file == null) {
            throw new Error("File not found");
          }
          if (file.isDirectory) {
            // open in explorer
            dispatch(setSelectedTab({ id, key: "files" }));
            await dispatch(sessionList({ id: id, path: shortcut.value, clearFilter: true }));
          } else if (file.isRegularFile) {
            // open as file
            await files.openFile(file.fullName, 'files');
          } else {
            toast.error("Unknown file type");
          }
          break;
        }
        case "service": {
          // filter in services
          dispatch(
            processSessionServices({
              id,
              params: {
                searchText: shortcut.value,
              },
            })
          );
          dispatch(setSelectedTab({ id, key: "services" }));
        }
        default:
          console.warn(`Unknown shortcut type ${shortcut.type}`, shortcut);
      }
    } catch (err) {
      console.error("could not process shortcut", err, shortcut);
      toast.error("Error processing shortcut");
    }
  };

  return {
    newShortcut,
    removeShortcut,
    executeShortcut,
  };
};
