import {
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useAppDispatch, useRemote } from "../../store/store";
import { useState } from "react";
import { toast } from "react-toastify";
import { sftpFileToChmod } from "../../../shared/utils/unitPermissionsToChmod";
import { sessionList } from "../../store/remotesSlice";
import { useFiles } from "./files.hook";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { RemoteFile } from "../../../shared/models/RemoteFile";
import { ipc } from "../../app";

export const PermissionModal = ({
  id,
  fileInput,
  onClose,
}: {
  id: string;
  fileInput: RemoteFile;
  onClose: () => void;
}) => {
  console.log("RENDER PermissionModal", id, fileInput);

  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const remote = useRemote(id);
  const files = useFiles(id);

  const [file, setFile] = useState<RemoteFile>(JSON.parse(JSON.stringify(fileInput)));
  const [originalFile] = useState<RemoteFile>(fileInput);
  const [r, setR] = useState(false);

  const changePermissionsOnRemote = async () => {
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

      // confirm
      const chmod = sftpFileToChmod(file);
      const recursive = r;
      if (
        !(await confirm({
          title: "Change permissions?",
          message: "Change permissions of " + file.fullName + " to " + chmod + " " + (recursive ? "recursively" : ""),
          yes: "Change",
        }))
      ) {
        return;
      }

      // change
      await ipc.invoke('changePermission', id, file.fullName, chmod, recursive);
      toast.success("Permission changed to " + chmod);
      onClose();
    } catch (err) {
      console.error("failed to change permissions", file);
      toast.error("Failed to change permissions");
      onClose();
    } finally {
      dispatch(sessionList({ id: id, path: remote.session.explorer.dir }));
    }
  };

  const hasPermissionsChanged = () => {
    if (file == null || file == null) {
      return false;
    }
    if (JSON.stringify(file) === JSON.stringify(originalFile)) {
      return false;
    } else {
      return true;
    }
  };
  const handleChange = (func: (file: RemoteFile) => void) => {
    try {
      if (file == null) {
        throw new Error("No file is selected");
      }
      const newFile = JSON.parse(JSON.stringify(file)) as RemoteFile;
      func(newFile);
      setFile(newFile);
    } catch (err) {
      console.error("failed to change user/group", file, err);
      toast.error("Failed to change user/group");
    }
  };

  // html
  return (
    <Modal isOpen={true} onClose={onClose} backdrop="blur" size="md">
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">Permissions of {file.fullName}</ModalHeader>
          <ModalBody>
            <Table hideHeader removeWrapper aria-label="List of permissions">
              <TableHeader>
                <TableColumn key="name">NAME</TableColumn>
                <TableColumn key="read">READ</TableColumn>
                <TableColumn key="write">WRITE</TableColumn>
                <TableColumn key="execute">EXECUTE</TableColumn>
              </TableHeader>
              <TableBody
                items={remote.session.explorer.filtered}
                isLoading={remote.session.explorer.loading}
                loadingContent={<Spinner color="white" />}
              >
                <TableRow key="header">
                  <TableCell> </TableCell>
                  <TableCell>READ</TableCell>
                  <TableCell>WRITE</TableCell>
                  <TableCell>EXEC</TableCell>
                </TableRow>
                <TableRow key="owner">
                  <TableCell>OWNER</TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.ownerCanRead === true}
                      onValueChange={(x) => handleChange((file) => (file.ownerCanRead = x))}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.ownerCanWrite === true}
                      onValueChange={(x) => handleChange((file) => (file.ownerCanWrite = x))}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.ownerCanExecute === true}
                      onValueChange={(x) => handleChange((file) => (file.ownerCanExecute = x))}
                    ></Checkbox>
                  </TableCell>
                </TableRow>

                <TableRow key="group">
                  <TableCell>GROUP</TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.groupCanRead === true}
                      onValueChange={(x) => handleChange((file) => (file.groupCanRead = x))}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.groupCanWrite === true}
                      onValueChange={(x) => handleChange((file) => (file.groupCanWrite = x))}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.groupCanExecute === true}
                      onValueChange={(x) => handleChange((file) => (file.groupCanExecute = x))}
                    ></Checkbox>
                  </TableCell>
                </TableRow>

                <TableRow key="other">
                  <TableCell>OTHER</TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.othersCanRead === true}
                      onValueChange={(x) => handleChange((file) => (file.othersCanRead = x))}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.othersCanWrite === true}
                      onValueChange={(x) => handleChange((file) => (file.othersCanWrite = x))}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      isSelected={file.othersCanExecute === true}
                      onValueChange={(x) => handleChange((file) => (file.othersCanExecute = x))}
                    ></Checkbox>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ModalBody>
          <ModalFooter className="items-center gap-4">
            {/*
              {hasPermissionsChanged() === false && <Chip>{sftpFileToChmod(file)}</Chip>}
              {hasPermissionsChanged() === true && (
                <Chip>
                  {sftpFileToChmod(originalFile)} to {sftpFileToChmod(file)}
                </Chip>
              )}
            */}

            <div className="flex-1"></div>
            {file.isDirectory == true && (
              <Checkbox isSelected={r} onValueChange={setR}>
                Recursive
              </Checkbox>
            )}
            <Button
              color="primary"
              onClick={changePermissionsOnRemote}
              isDisabled={hasPermissionsChanged() == false && !r}
            >
              Change to {sftpFileToChmod(file)}
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
};
