import { toast } from "react-toastify";
import { useAppDispatch, useRemote, useRemoteSelector } from "../../store/store";
import {
  selectAllShells,
  sessionCreateShell,
  sessionDestroyShell,
  selectShell,
  selectShellById,
} from "../../store/remotesSlice";

export const useShells = (id: string) => {
  const appDispatch = useAppDispatch();
  const remote = useRemote(id);
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
  const add = async (initialCommand?:string) => {
    await appDispatch(sessionCreateShell({ id: id, initialCommand: initialCommand }));
  };
  const addFirstOrDoNothing = async () => {
    if (shells.length == 0 && !remote.session.shells.initializedFirstShell) {
      await add();
    }
  };
  const remove = async (shellId: string) => {
    const shellById = shells.find((x) => x.shellId == shellId);
    if (shellById == null || shellById.shellId == null) {
      return;
    }
    await appDispatch(sessionDestroyShell({ id: id, shellId: shellById.shellId, onlyRemoveFromRenderer: false }));
  };
  const select = (shellId: string) => {
    try {
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
    addFirstOrDoNothing
  };
};
