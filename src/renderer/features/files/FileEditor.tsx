import { Button, Chip, Divider } from "@nextui-org/react";
import { Editor } from "@monaco-editor/react";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { changeSessionFile, closeSessionFile } from "../../store/remotesSlice";
import { toast } from "react-toastify";
import { filesize } from "filesize";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { ServicesDropdown } from "../services/ServicesDropdown";
import { useFiles } from "./files.hook";
import { useServices } from "../services/services.hook";
import { FaBars, FaDownload, FaInfo, FaLayerGroup, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import { ipc } from "../../app";
import { TabName } from "../../models/TabName";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { FileDropdown } from "./FileDropdown";

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
    return <p>File not found: {fileTab}</p>
  } else if (file.filePath == null || file.filePath == "") {
    return <p>File has no path specified: {fileTab}</p>
  } else if (file.type == null) {
    return <p>File has no type specified: {fileTab}</p>
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
      await ipc.invoke("writeText", id, file.filePath, file.contents ?? "");

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
    <HeaderScrollBodyLayout
      header={
        <div className="flex flex-row gap-2 items-center">
          {/* Name */}
          <span className="font-mono text-xl">{file.name}</span>

          {/* Space */}
          <span className="flex-1"></span>

          {/* Revert */}
          <Button isDisabled={!hasChanges || file.loading || services.loading} onClick={revert}>
            Revert
          </Button>

          {/* Save or Create */}
          <Button
            isDisabled={!hasChangesOrIsNew || file.loading || services.loading}
            isLoading={file.loading}
            color="success"
            onClick={handleSave}
          >
            <FaSave></FaSave>
            {file.isNew ? "Create " + file.type : "Save " + file.type}
          </Button>

          {/* Service Dropdown */}
          {file.type == "Service" && (
            <ServicesDropdown
              id={id}
              serviceName={file.name}
              dropdownTrigger={
                <Button isIconOnly variant="light">
                  <FaLayerGroup></FaLayerGroup>
                </Button>
              }
            ></ServicesDropdown>
          )}

          {/* Dropdown */}
          {!file.isNew && <FileDropdown id={id} file={file}></FileDropdown>}

          {/* Close */}
          <Divider orientation="vertical"></Divider>
          <Button variant="light" isDisabled={file.loading || services.loading} onClick={handleClose} isIconOnly={true}>
            <FaTimes></FaTimes>
          </Button>
        </div>
      }
      bodyScrollable={false}
      body={
        <div className="w-full h-full max-h-full flex flex-col gap-4 pb-4">
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 right-0 bottom-0">
              <Editor
                className="rounded-lg overflow-hidden"
                theme="vs-dark"
                language={undefined}
                height="100%"
                value={file.contents}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      }
    ></HeaderScrollBodyLayout>
  );
};
