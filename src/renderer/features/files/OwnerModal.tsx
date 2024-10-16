import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@nextui-org/react";
import { useAppDispatch, useRemote } from "../../store/store";
import { useState } from "react";
import { toast } from "react-toastify";
import { sessionList } from "../../store/remotesSlice";
import { useFiles } from "./files.hook";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { useAsyncEffect } from "../../utils/useAsyncEffect";
import { escapeUnixShellArg } from "../../../shared/utils/escapeUnixShellArg";
import { RemoteFile } from "../../../shared/models/RemoteFile";
import { UserGroup } from "../../../shared/models/UserGroup";
import { ipc } from "../../app";

export const OwnerModal = ({ id, file, onClose }: { id: string; file: RemoteFile; onClose: () => void }) => {
  console.log("RENDER OwnerModal", id, file);

  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const remote = useRemote(id);
  const files = useFiles(id);

  const [userId, setUserId] = useState<number>(file?.userId ?? -1);
  const [groupId, setGroupId] = useState<number>(file?.groupId ?? -1);

  const [users, setUsers] = useState<UserGroup[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);

  const [recursive, setRecursive] = useState(false);

  const [loading, setLoading] = useState(true);

  useAsyncEffect(async () => {
    try {
      const users = await ipc.invoke("getUsers", id);
      setUsers(users);

      const groups = await ipc.invoke("getGroups", id);
      setGroups(groups);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load users/groups", err, id);
      toast.error("Failed to load users/groups");
      onClose();
    }
  }, []);

  const changeUserGroupOnRemote = async () => {
    try {
      // check
      if (file == null) {
        throw new Error("No file selected");
      }
      if (!file.isRegularFile && !file.isDirectory) {
        throw new Error("Only works on files and folders");
      }
      if (files.isSpecial(file.fullName) || file.name == "" || file.name == "." || file.name == "..") {
        throw new Error("This folder is a special directory");
      }

      // get user and group
      const user = users.find((x) => x.id == userId)?.name;
      if (user == null || user == "") {
        throw new Error("No user choosen");
      }

      const group = groups.find((x) => x.id == groupId)?.name;
      if (group == null || group == "") {
        throw new Error("No group choosen");
      }

      // confirm
      if (
        !(await confirm({
          title: "Change owner",
          message:
            "Change permissions of " +
            file.fullName +
            " to " +
            user +
            "/" +
            group +
            " " +
            (recursive ? "recursively" : ""),
          yes: "Change",
        }))
      ) {
        return;
      }

      // change
      const command =
        "sudo chown " + (recursive ? "-R " : "") + user + ":" + group + " " + escapeUnixShellArg(file.fullName);
      const result = await ipc.invoke("executeSshCommand", id, command);
      if (!result.success) {
        toast.error(result.output);
      } else if (result.output && result.output != '') {
        toast.info(result.output);
      } else {
        toast.success("Owner changed");
      }
      onClose();
    } catch (err) {
      console.error("failed to change owner", file);
      toast.error("Failed to change owner");
      onClose();
    } finally {
      dispatch(sessionList({ id: id, path: remote.session.explorer.dir }));
    }
  };

  const hasChanged = () => {
    return userId !== file?.userId || groupId !== file.groupId;
  };

  const getKey = (key: number | string | null | undefined) => {
    return key?.toString() ?? "null";
  };

  // html
  return (
    <Modal isOpen={true} onClose={onClose} backdrop="blur" size="md">
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">Owner/Group of {file.fullName}</ModalHeader>
          <ModalBody className="flex-row">
            {loading && <Spinner></Spinner>}
            {!loading && (
              <>
                <Autocomplete
                  label="User"
                  defaultItems={users}
                  selectedKey={getKey(userId)}
                  onSelectionChange={(e) => setUserId(+e)}
                >
                  {(x) => <AutocompleteItem key={getKey(x.id)}>{x.name}</AutocompleteItem>}
                </Autocomplete>
                <Autocomplete
                  label="Group"
                  defaultItems={groups}
                  selectedKey={getKey(groupId)}
                  onSelectionChange={(e) => setGroupId(+e)}
                >
                  {(x) => <AutocompleteItem key={getKey(x.id)}>{x.name}</AutocompleteItem>}
                </Autocomplete>
              </>
            )}
          </ModalBody>
          <ModalFooter className="items-center gap-4">
            <div className="flex-1"></div>
            {file.isDirectory == true && (
              <Checkbox isSelected={recursive} onValueChange={setRecursive}>
                Recursive
              </Checkbox>
            )}
            <Button color="primary" isDisabled={!hasChanged() && !recursive} onClick={changeUserGroupOnRemote}>
              Change
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
};
