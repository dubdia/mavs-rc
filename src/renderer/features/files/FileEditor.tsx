import { Button, Chip } from "@nextui-org/react";
import { Editor } from "@monaco-editor/react";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { changeSessionFile, closeSessionFile } from "../../store/remotesSlice";
import { toast } from "react-toastify";
import { filesize } from "filesize";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { ServicesDropdown } from "../services/ServicesDropdown";
import { useFiles } from "./files.hook";
import { useServices } from "../services/services.hook";
import { FaDownload, FaInfo } from "react-icons/fa";
import { ipc } from "../../app";
import { TabName } from "../../models/TabName";

export const FileEditor = ({ id, fileTab }: { id: string; fileTab: TabName }) => {
  console.log("RENDER FileEditor", id, fileTab);

  // use hooks
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const files = useFiles(id);
  const services = useServices(id);

  // get file from remote
  const file = useRemoteSelector(id, (r) => r.session.files.find((x) => x.tab == fileTab));
  if (file == null || file.tab == null) {
    return <p>File not found: {fileTab}</p>;
  } else if (file.filePath == null || file.filePath == "") {
    return <p>File has no path specified: {fileTab}</p>;
  } else if (file.type == null) {
    return <p>File has no type specified: {fileTab}</p>;
  }

  const hasChanges = file.contents !== file.originalContents;
  const hasChangesOrIsNew = hasChanges || file.isNew === true;

  const setLoading = (loading: boolean) => {
    dispatch(
      changeSessionFile({
        id: id,
        fileTab: fileTab,
        func: (file) => {
          file.loading = loading;
        },
      })
    );
  };

  const revert = async () => {
    if (file.loading) {
      toast.warn("Please wait");
      return;
    }

    if (!(await confirm({ title: "Revert changes?", yes: "Revert", no: "Cancel" }))) {
      return;
    }
    dispatch(
      changeSessionFile({
        id: id,
        fileTab: fileTab,
        func: (file) => {
          file.contents = file.originalContents;
        },
      })
    );
  };

  const handleChange = (newContents: string | null | undefined) => {
    if (file.loading) {
      toast.warn("Please wait");
      return;
    }
    dispatch(
      changeSessionFile({
        id: id,
        fileTab: fileTab,
        func: (file) => {
          file.contents = newContents ?? "";
        },
      })
    );
  };

  const handleSave = async () => {
    if (file.loading) {
      toast.warn("Please wait");
      return;
    }
    try {
      // update/create file
      setLoading(true);
      await ipc.invoke('writeText',id, file.filePath, file.contents ?? "");

      // update state
      dispatch(
        changeSessionFile({
          id: id,
          fileTab: fileTab,
          func: (file) => {
            file.originalContents = file.contents ?? "";
            file.isNew = false;
          },
        })
      );

      toast.success(file.type + " saved");
    } catch (err) {
      // handle error
      console.error("failed to save", id, file, err);
      toast.error("Failed to save " + file.type);
    } finally {
      // finally
      setLoading(false);

      // reload systemd services
      if (file.type == "Service") {
        await services.daemonReload();
      }
    }
  };

  const handleClose = async () => {
    if (hasChanges) {
      const closeAnyway = await confirm({ title: "Close without saving?", yes: "Close", no: "Cancel" });
      if (closeAnyway == false) {
        return;
      }
    }
    dispatch(closeSessionFile({ id: id, filePath: file.filePath }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Editor
        className="rounded-lg overflow-hidden"
        theme="vs-dark"
        language={undefined}
        height="500px"
        value={file.contents}
        onChange={handleChange}
      />
      <div className="flex flex-row gap-2 items-center">
        {/* Close */}
        <Button onClick={handleClose}>Close</Button>

        {/* Info */}
        <Button
          isDisabled={file.isNew || file.loading || services.loading}
          isIconOnly={true}
          onClick={() => files.showInfo(file.filePath)}
        >
          <FaInfo />
        </Button>

        {/* Download */}
        <Button
          isDisabled={file.isNew || file.loading || services.loading}
          isIconOnly={true}
          onClick={() => files.download(file.filePath)}
        >
          <FaDownload />
        </Button>

        {/* Size */}
        <Chip>Size: {filesize(file.contents.length)}</Chip>
        <div className="flex-1"></div>

        {/* Generic actions */}
        <Button
          isDisabled={file.isNew || file.loading || services.loading}
          onClick={() => files.removeFile(file.filePath)}
          color="danger"
        >
          Delete
        </Button>
        <Button isDisabled={!hasChanges || file.loading || services.loading} onClick={revert}>
          Revert
        </Button>
        <Button
          isDisabled={!hasChangesOrIsNew || file.loading || services.loading}
          isLoading={file.loading}
          color="primary"
          onClick={handleSave}
        >
          {file.isNew ? "Create " + file.type : "Save " + file.type}
        </Button>

        {/* Service actions */}
        {file.type == "Service" && <ServicesDropdown id={id} serviceName={file.name}></ServicesDropdown>}
      </div>
    </div>
  );
};
