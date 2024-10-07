import { toast } from "react-toastify";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { useInput } from "../../components/dialogs/InputDialog";
import {
  addSessionFile,
  closeSessionFile,
  selectSessionFile,
  sessionList,
  setSelectedTab,
} from "../../store/remotesSlice";
import { useAppDispatch, useRemote } from "../../store/store";
import { escapeUnixShellArg } from "../../../shared/utils/escapeUnixShellArg";
import { useInfo } from "../../components/dialogs/InfoDialog";
import { ipc } from "../../app";
import { RemoteFile } from "../../../shared/models/RemoteFile";
import { joinPath } from "../../../shared/utils/io/joinPath";
import { getDirectoryName } from "../../../shared/utils/io/getDirectoryName";
import { getFileExtension } from "../../../shared/utils/io/getFileExtension";
import { getFileName } from "../../../shared/utils/io/getFileName";
import { getFileTabName } from "../../utils/getFileTabName";
import { createFile } from "../../models/SessionFile";
import { TabName } from "../../models/TabName";

export const useFiles = (id: string) => {
  const input = useInput();
  const info = useInfo();
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const remote = useRemote(id);

  const openFile = async (filePath: string, onCloseNavigateBackTo?: TabName) => {
    try {
      // check file
      if (filePath == null || filePath == "") {
        throw new Error("Path was not given");
      }

      // check if already loaded into session
      const tabName = getFileTabName(id, filePath);
      const existing = remote.session.files.find((x) => x.tab == tabName);
      if (existing) {
        // select existing
        dispatch(selectSessionFile({ id: id, file: existing }));
      } else {
        // create new
        const fileContents = await ipc.invoke("readText", id, filePath);
        const file = createFile({
          tab: tabName,
          filePath: filePath,
          contents: fileContents.contents ?? "",
          onCloseNavigateBackTo: onCloseNavigateBackTo,
          isNew: false,
        });

        // open and select it
        dispatch(addSessionFile({ id: id, file: file, select: true }));
      }
    } catch (err) {
      console.error("error while opening file", err, filePath);
      toast.error("An error occured while opening the file: " + filePath);
    }
  };

  const getFile = async (path: string): Promise<RemoteFile> => {
    if (path == null || path == "") {
      throw new Error("Path was not given");
    }
    const file = await ipc.invoke("getFile", id, path);
    if (file == null || file.fullName == null) {
      throw new Error("Unable to fetch file from api: " + path);
    }
    return file;
  };

  const isFileOrFolder = (file: RemoteFile) => {
    if (file.isRegularFile !== true && file.isDirectory !== true) {
      return false;
    }
    if (isSpecial(file.fullName)) {
      return false;
    }
    return true;
  };
  const isSpecial = (path: string | null | undefined): boolean => {
    if (path == null || path == "") {
      return true;
    }
    if (path.endsWith(".") || path.endsWith("..")) {
      return true;
    }
    return false;
  };

  const isArchiveFile = (filePath: string | null | undefined): boolean => {
    if (filePath == null || filePath == "") {
      return false;
    }
    filePath = filePath.toLocaleLowerCase();
    return (
      filePath.endsWith(".zip") ||
      filePath.endsWith(".rar") ||
      filePath.endsWith(".gz") ||
      filePath.endsWith(".tar") ||
      filePath.endsWith(".7z")
    );
  };

  const newFile = async (type: "file" | "folder") => {
    try {
      // ask user for new name
      const name = await input({
        title: "Create " + type,
        message: "Enter the " + type + " name here",
        initialValue: type == "file" ? "file.txt" : "",
        yes: "Create",
      });
      if (
        name == null ||
        name.trim() == "" ||
        name.length > 128 ||
        name.indexOf("/") >= 0 ||
        name.indexOf("&") >= 0 ||
        name.indexOf("'") >= 0
      ) {
        return;
      }

      // create it
      const dir = joinPath([remote.session.explorer.dir, name.trim()], remote.dto.osType);
      const dirParam = escapeUnixShellArg(dir);
      if (type == "file") {
        await ipc.invoke("executeSshCommand", id, "touch " + dirParam);
      } else if (type == "folder") {
        await ipc.invoke("executeSshCommand", id, "mkdir " + dirParam);
      }

      // reload
      dispatch(sessionList({ id: id, path: remote.session.explorer.dir, clearFilter: true }));
      toast.success("Created " + name);
    } catch (err) {
      console.error("failed to create new file or folder", type, err);
      toast.error("Failed to create new " + type);
    }
  };
  const removeFile = async (path: string) => {
    try {
      // get & check
      const file = await getFile(path);
      if (!isFileOrFolder(file)) {
        toast.error("This is not a file or folder");
        return;
      }

      // ask user for new name
      const ok = await confirm({
        title: "Delete " + file.fullName + "?",
        yes: "Delete",
      });
      if (ok !== true) {
        return;
      }

      // remote it
      if ((file.isRegularFile || file.isDirectory) && file.fullName != null) {
        //const dirArg = escapeUnixShellArg(file.fullName);
        //await ipc.invoke("executeSshCommand", id, "rm -rf " + dirArg);
        await ipc.invoke("delete", id, file.fullName);
      }

      // close eventually open file tabs
      dispatch(closeSessionFile({ id: id, filePath: file.fullName ?? "" }));

      // reload
      dispatch(sessionList({ id: id, path: remote.session.explorer.dir }));
      toast.success("Deleted " + file.name);
    } catch (err) {
      console.error("failed to delete file or folder", path, err);
      toast.error("Failed to delete");
    }
  };
  const renameFile = async (path: string) => {
    try {
      // get & check
      const file = await getFile(path);
      if (!isFileOrFolder(file)) {
        toast.error("This is not a file or folder");
        return;
      }

      // ask user for new name
      const name = await input({
        title: "Rename",
        message: "Enter the new name of " + file.name + " here",
        initialValue: file.name,
        yes: "Rename",
      });
      if (
        name == null ||
        name == file.name ||
        name.trim() == "" ||
        name.length > 128 ||
        name.indexOf("/") >= 0 ||
        name.indexOf("&") >= 0 ||
        name.indexOf("'") >= 0
      ) {
        return;
      }

      // create it
      //const oldDirArg = escapeUnixShellArg(joinPath([remote.session.explorer.dir, file.name ?? ""], remote.dto.osType));
      //const newDirArg = escapeUnixShellArg(joinPath([remote.session.explorer.dir, name.trim()], remote.dto.osType));

      const oldDir = joinPath([remote.session.explorer.dir, file.name ?? ""], remote.dto.osType);
      const newDir = joinPath([remote.session.explorer.dir, name.trim()], remote.dto.osType);

      if (file.isRegularFile || file.isDirectory) {
        //ipc.invoke("executeSshCommand", id, "mv " + oldDirArg + " " + newDirArg);
        await ipc.invoke("rename", id, oldDir, newDir);
      }

      // reload
      dispatch(sessionList({ id: id, path: remote.session.explorer.dir }));
      toast.success("Renamed " + file.name);
    } catch (err) {
      console.error("failed to rename file or folder", path, err);
      toast.error("Failed to rename");
    }
  };
  const showInfo = async (path: string) => {
    try {
      // get
      const file = await getFile(path);

      // show info
      let msg = JSON.stringify(file, null, 2);
      await info({ title: file.name, message: msg });
    } catch (err) {
      console.error("failed to show info", path, err);
      toast.error("Failed to show info");
    }
  };

  const download = async (path: string) => {
    try {
      // check
      if (path == null || path == "") {
        throw new Error("No path given");
      }

      // get infos
      const fileInfo = await ipc.invoke("getFile", id, path);

      // download depending on type
      if (fileInfo.isRegularFile === true) {
        // download file to client
        const success = await ipc.invoke("downloadFile", id, path);
        if (success) {
          toast.success("File downloaded");
        } else {
          toast.warn("Download cancelled");
        }
      } else if (fileInfo.isDirectory === true) {
        // download folder to client after confirm
        if (!(await confirm({ title: "Download this folder?", message: path, yes: "Download Zip" }))) {
          return;
        }

        // download folder to client
        const success = await ipc.invoke("downloadFolderAsZip", id, path); //todo name function correctly
        if (success) {
          toast.success("Folder downloaded");
        } else {
          toast.warn("Download cancelled");
        }
      } else {
        throw new Error("Path is not file or folder");
      }
    } catch (err) {
      console.error("failed to download", path, err);
      toast.error("Failed to download");
    }
  };

  const uploadFileFromUser = async (directory: string) => {
    // ask user for file
    const filePath = await ipc.invoke("pickFilePath", "Choose file to upload", "Choose", true);
    if (!filePath) {
      return;
    }

    await uploadFile(directory, filePath);
  };
  const uploadFile = async (directory: string, localFilePath: string) => {
    try {
      // check
      if (directory == null || directory == "") {
        throw new Error("No path given");
      }
      if (localFilePath == null || localFilePath == "") {
        throw new Error("No file given");
      }

      // ask user for file path
      const fileName = getFileName(localFilePath) ?? "file.bin";
      const originalPath = joinPath([directory, fileName], remote.dto.osType);
      const remoteFilePath = await input({ message: "Enter upload path", yes: "Upload", initialValue: originalPath });
      if (remoteFilePath == null || remoteFilePath == "") {
        return;
      }

      // check if path exists
      const exists = await ipc.invoke("exists", id, remoteFilePath);
      if (exists == true) {
        const confirmed = await confirm({ message: "The file does already exists. Overwrite it?", yes: "Overwrite" });
        if (confirmed !== true) {
          return;
        }
      }

      // upload
      toast.info("Uploading...");
      await ipc.invoke("uploadFile", id, localFilePath, remoteFilePath, true);
      toast.success("Uploaded: " + fileName);
    } catch (err) {
      console.error("failed to upload file", directory, localFilePath, err);
      toast.error("Failed to upload file");
    } finally {
      await dispatch(sessionList({ id: id, path: remote.session.explorer.dir, clearFilter: false }));
    }
  };
  const unpackFile = async (path: string) => {
    try {
      // check
      if (path == null || path == "") {
        throw new Error("No path given");
      }

      // get infos
      const fileInfo = await ipc.invoke("getFile", id, path);

      // download depending on type
      if (fileInfo.isRegularFile !== true || !isArchiveFile(fileInfo.fullName) || fileInfo.fullName == null) {
        toast.error("This file cannot be unpacked");
        return;
      }

      // build initial target dir
      let targetDir = "";
      const fileExtension = getFileExtension(fileInfo.fullName);
      if (fileExtension != null && fileExtension.length > 0) {
        const filePathWithoutExtension = fileInfo.fullName.substring(
          0,
          fileInfo.fullName.length - fileExtension.length
        );
        targetDir = filePathWithoutExtension;
      } else {
        targetDir = getDirectoryName(fileInfo.fullName);
      }

      // input for path
      const choosenDir = await input({
        title: "Unpack " + fileExtension + " archive",
        message: "Choose target folder",
        yes: "Unpack",
        initialValue: targetDir,
      });
      if (choosenDir == null || choosenDir == "") {
        return;
      }

      // check if directory exists
      const choosenDirExists = await ipc.invoke("exists", id, choosenDir);
      if (choosenDirExists !== true) {
        await ipc.invoke("executeSshCommand", id, "mkdir " + escapeUnixShellArg(choosenDir));
      }

      // unpack
      const command = "unzip " + escapeUnixShellArg(fileInfo.fullName) + " -d " + escapeUnixShellArg(choosenDir);
      const result = await ipc.invoke("executeSshCommand", id, command);
      if (!result.success) {
        toast.error(result.output);
      } else {
        toast.success("Unpacked: " + fileInfo.name);
      }
    } catch (err) {
      console.error("failed to download", path, err);
      toast.error("Failed to download");
    } finally {
      await dispatch(sessionList({ id: id, path: remote.session.explorer.dir, clearFilter: false }));
    }
  };

  const changeDirInTerminal = async (directory: string) => {
    try {
      // build command (x15 clears terminal line, \r submitts the command)
      let path = directory;
      if (path == null || path == "") {
        path = "/";
      }
      const command = "\x15" + "cd " + escapeUnixShellArg(path) + "\r";

      // get open shells

      // go to terminal and cd into the path
      //dispatch(setSelectedTab({ id: id, key: "shell" }));
      //ipc.invoke("sendShell", id, command); //TODO
    } catch (err) {
      console.error("failed to cd into dir in terminal", err);
      toast.error("Failed to cd into path");
    }
  };

  return {
    isFileOrFolder,
    isSpecial,
    isArchiveFile,
    newFile,
    openFile,
    removeFile,
    renameFile,
    showInfo,
    download,
    uploadFileFromUser,
    uploadFile,
    unpackFile,
    changeDirInTerminal,
  };
};
