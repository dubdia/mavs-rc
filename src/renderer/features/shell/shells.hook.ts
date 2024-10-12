import { toast } from "react-toastify";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { useInput } from "../../components/dialogs/InputDialog";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import {
  selectScriptById,
  selectAllShells,
  sessionCreateShell,
  sessionDestroyShell,
  selectShell,
  selectShellById,
} from "../../store/remotesSlice";

export const useShells = (id: string) => {
  const input = useInput();
  const appDispatch = useAppDispatch();
  const confirm = useConfirm();
  const shells = useRemoteSelector(id, (remote) => selectAllShells(remote.session));
  const shell = useRemoteSelector(id, (remote) =>
    selectShellById(remote.session, remote.session.shells.selectedShellId)
  );

  const list = () => {
    return shells;
  };
  const get = () => {
    return shell;
  };
  const add = async () => {
    try {
      await appDispatch(sessionCreateShell({ id: id }));
      toast.success("Created shell");
    } catch (err) {
      console.error("failed to create shell", err);
      toast.error("Failed to create new shell");
    }
  };
  const remove = async (shellId: string) => {
    const shellById = shells.find((x) => x.shellId == shellId);
    if (shellById == null || shellById.shellId == null) {
      return;
    }
    try {
      // remove
      await appDispatch(sessionDestroyShell({ id: id, shellId: shellById.shellId, onlyRemoveFromRenderer: false }));
      toast.success("Removed shell");
    } catch (err) {
      console.error("failed to remove shell", shellById, err);
      toast.error("Failed to remove shell");
    }
  };
  const select = (shellId: string) => {
    try {
      // remove
      appDispatch(selectShell({ id: id, shellId: shellId }));
    } catch (err) {
      console.error("failed to select shell", shellId, err);
      toast.error("Failed to select shell");
    }
  };

  return {
    list,
    get,
    add,
    remove,
    select,
  };
};
