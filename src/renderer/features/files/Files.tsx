import {
  BreadcrumbItem,
  Breadcrumbs,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { processSessionExplorer, sessionList } from "../../store/remotesSlice";
import { useEffect, useState } from "react";
import {
  FaArchive,
  FaArrowRight,
  FaBars,
  FaCube,
  FaDownload,
  FaFile,
  FaFolder,
  FaFolderPlus,
  FaInfo,
  FaMicrochip,
  FaQuestion,
  FaSearch,
  FaTerminal,
  FaTrash,
  FaUpload,
  FaUserLock,
} from "react-icons/fa";
import clsx from "clsx";
import { toast } from "react-toastify";
import { filesize } from "filesize";
import { getPermissionsText } from "../../../shared/utils/parseUnixPermissions";
import { useFiles } from "./files.hook";
import { ShortcutsDropdown } from "../shortcuts/ShortcutsDropdown";
import { ShortcutsToggle } from "../shortcuts/ShortcutsToggle";
import { PermissionModal } from "./PermissionModal";
import { OwnerModal } from "./OwnerModal";
import { FaDiagramProject, FaFileCirclePlus, FaLink, FaPenToSquare, FaRightLeft } from "react-icons/fa6";
import { RemoteFile } from "../../../shared/models/RemoteFile";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";

export const Files = ({ id }: { id: string }) => {
  const dispatch = useAppDispatch();
  const files = useFiles(id);
  const explorer = useRemoteSelector(id, (remote) => remote.session.explorer);
  useEffect(() => {
    dispatch(sessionList({ id: id, path: explorer.dir }));
  }, [dispatch]);

  const navigateToAsync = async (file: RemoteFile) => {
    // navigate to folder or open file
    if (file.isRegularFile && file.fullName != null) {
      await files.openFile(file.fullName, "files");
    } else if (file.isDirectory && file.fullName != null) {
      dispatch(sessionList({ id: id, path: file.fullName, clearFilter: true }));
    } else {
      toast.warn("Cannot handle file or folder");
    }
  };
  const navigateToIndex = (index: number) => {
    // prepare current dir
    let current = explorer.dir;
    if (current == null) {
      current = "";
    }
    if (current.startsWith("/")) {
      current = current.substring(1);
    }
    if (current.endsWith("/")) {
      current = current.substring(0, current.length - 1);
    }

    // build new dir up to index
    const folders = current.split("/");
    const newDir = "/" + folders.filter(Boolean).slice(0, index).join("/");

    // navigate
    dispatch(sessionList({ id: id, path: newDir, clearFilter: true }));
  };
  const getSegments = (): string[] => {
    let base = explorer.dir;
    if (base == null) {
      base = "";
    }
    if (base.startsWith("/")) {
      base = base.substring(1);
    }
    if (base.endsWith("/")) {
      base = base.substring(0, base.length - 1);
    }
    const segments = base.split("/").filter((x) => x != null && x != "");
    return ["Root", ...segments];
  };

  const getIcon = (file: RemoteFile): React.ReactNode => {
    if(file.isDirectory) {
      return <FaFolder className="text-yellow-300"></FaFolder>;
    } else if(file.isRegularFile) {
      return <FaFile className="text-zinc-300"></FaFile>
    } else if(file.isBlockDevice) {
      return <FaCube className="text-zinc-300"></FaCube>
    } else if(file.isCharacterDevice) {
      return <FaMicrochip className="text-zinc-300"></FaMicrochip>
    } else if(file.isNamedPipe) {
      return <FaRightLeft className="text-zinc-300"></FaRightLeft>
    } else if(file.isSocket) {
      return <FaDiagramProject className="text-zinc-300"></FaDiagramProject>
    } else if(file.isSymbolicLink) {
      return <FaLink className="text-zinc-300"></FaLink>
    } else {
      return <FaQuestion className="text-pink-300"></FaQuestion>
    }
  }

  console.log("RENDER Files", explorer);

  // modals
  const [showPermissionsOf, setShowPermissionsOf] = useState<RemoteFile | null>(null);
  const [showOwnerOf, setShowOwnerOf] = useState<RemoteFile | null>(null);

  // html
  return (
    <>
      <HeaderScrollBodyLayout
        header={
          <div className="flex flex-row gap-4 items-center">
            {/* Current path */}
            <Breadcrumbs
              className="shrink-0"
              separator="/"
              itemClasses={{
                separator: "px-2",
              }}
            >
              {getSegments().map((x, i) => (
                <BreadcrumbItem
                  key={x + i}
                  className="cursor-pointer hover:font-bold font-mono "
                  onClick={() => navigateToIndex(i)}
                >
                  <span className="font-mono text-xl ">{x}</span>
                </BreadcrumbItem>
              ))}
            </Breadcrumbs>

            {/* Search */}
            <Input
              isClearable
              classNames={{
                inputWrapper: "border-1",
              }}
              placeholder="Search by name..."
              startContent={<FaSearch className="text-default-300" />}
              value={explorer.searchText}
              variant="bordered"
              onClear={() =>
                dispatch(
                  processSessionExplorer({
                    id: id,
                    params: { searchText: "" },
                  })
                )
              }
              onValueChange={(x) =>
                dispatch(
                  processSessionExplorer({
                    id: id,
                    params: { searchText: x },
                  })
                )
              }
            />

            {/* Favs button */}
            <ShortcutsDropdown key="files-shortcuts" id={id} type={"file"}></ShortcutsDropdown>

            {/* Dropdown */}
            <Dropdown backdrop="blur" isDisabled={explorer.loading}>
              <DropdownTrigger>
                <Button isIconOnly variant="light">
                  <FaBars></FaBars>
                </Button>
              </DropdownTrigger>
              {/* generic actions */}
              <DropdownMenu aria-label="Static Actions">
                <DropdownSection>
                  <DropdownItem
                    key="Download"
                    onClick={() => files.download(explorer.dir)}
                    startContent={<FaDownload />}
                  >
                    Download
                  </DropdownItem>

                  <DropdownItem
                    key="upload"
                    startContent={<FaUpload />}
                    onClick={() => files.uploadFileFromUser(explorer.dir)}
                  >
                    Upload
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection>
                  <DropdownItem
                    key="createFile"
                    onClick={() => files.newFile("file")}
                    startContent={<FaFileCirclePlus />}
                  >
                    Create file
                  </DropdownItem>
                  <DropdownItem
                    key="createFolder"
                    onClick={() => files.newFile("folder")}
                    startContent={<FaFolderPlus />}
                  >
                    Create folder
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection>
                  <DropdownItem
                    key="openInTerminal"
                    onClick={() => files.changeDirInTerminal(explorer.dir)}
                    startContent={<FaTerminal />}
                  >
                    Open in Terminal
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          </div>
        }
        body={
          <Table
            aria-label="List of files and folders"
            sortDescriptor={explorer.sortDescriptor}
            onSortChange={(s) => dispatch(processSessionExplorer({ id: id, params: { sortDescriptor: s } }))}
          >
            <TableHeader>
              <TableColumn key="shortcut" allowsSorting={false} width="0">
                {" "}
              </TableColumn>
              <TableColumn key="name" allowsSorting={true} width="100%">
                NAME
              </TableColumn>
              <TableColumn key="size" allowsSorting={true}>
                SIZE
              </TableColumn>
              <TableColumn key="owner" allowsSorting={true}>
                OWNER
              </TableColumn>
              <TableColumn key="permissions" allowsSorting={true}>
                PERMISSIONS
              </TableColumn>
              <TableColumn className="pl-0 pr-0 w-0" width="0">
                {" "}
              </TableColumn>
            </TableHeader>
            <TableBody
              items={explorer.filtered}
              isLoading={explorer.loading}
              loadingContent={<Spinner color="white" />}
            >
              {(item) => (
                <TableRow key={item.name}>
                  {/* Shortcut / Favorite */}
                  <TableCell>
                    {files.isFileOrFolder(item) === true && (
                      <ShortcutsToggle id={id} type={"file"} value={item.fullName ?? ""}></ShortcutsToggle>
                    )}
                    {files.isFileOrFolder(item) === false && item.name == "." && (
                      <ShortcutsToggle
                        id={id}
                        type={"file"}
                        value={item.fullName.substring(0, item.fullName.length - 2)}
                      ></ShortcutsToggle>
                    )}
                  </TableCell>

                  {/* Icon & Name */}
                  <TableCell
                    className="font-mono font-bold text-white cursor-pointer"
                    onClick={() => navigateToAsync(item)}
                  >
                    <p
                      title={item.fullName}
                      key={item.fullName}
                      className={clsx(
                        "cursor-pointer hover:font-bold flex flex-dir items-center gap-2",
                        item.name == ".." && "mb-2"
                      )}
                    >
                      {getIcon(item)}
                      {item.name}
                    </p>
                  </TableCell>

                  {/* Size */}
                  <TableCell className="font-mono text-nowrap">
                    {item.isRegularFile && filesize(item.length ?? 0)}
                  </TableCell>

                  {/* Owner User/Group */}
                  <TableCell className="font-mono cursor-pointer" onClick={() => setShowOwnerOf(item)}>
                    {item.userName ?? item.userId}/{item.groupName ?? item.groupId}
                  </TableCell>

                  {/* Permissions */}
                  <TableCell className="font-mono cursor-pointer" onClick={() => setShowPermissionsOf(item)}>
                    {getPermissionsText(item)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {files.isFileOrFolder(item) && (
                      <Dropdown backdrop="blur">
                        <DropdownTrigger>
                          <Button isIconOnly variant="light">
                            <FaBars></FaBars>
                          </Button>
                        </DropdownTrigger>
                        {/* generic actions */}
                        <DropdownMenu aria-label="Actions">
                          <DropdownSection title={item.name}>
                            {[
                              <DropdownItem
                                key="navigateTo"
                                onClick={async () => await navigateToAsync(item)}
                                startContent={<FaArrowRight />}
                              >
                                {item.isRegularFile ? "Edit" : "Open"}
                              </DropdownItem>,
                              <DropdownItem
                                key="delete"
                                onClick={() => files.removeFile(item.fullName)}
                                startContent={<FaTrash />}
                              >
                                Delete
                              </DropdownItem>,
                              <DropdownItem
                                key="rename"
                                onClick={() => files.renameFile(item.fullName)}
                                startContent={<FaPenToSquare />}
                              >
                                Rename
                              </DropdownItem>,
                              <DropdownItem
                                key="permissions"
                                onClick={() => setShowPermissionsOf(item)}
                                startContent={<FaUserLock />}
                              >
                                Permissions
                              </DropdownItem>,
                              <DropdownItem
                                key="owner"
                                onClick={() => setShowOwnerOf(item)}
                                startContent={<FaUserLock />}
                              >
                                Owner User/Group
                              </DropdownItem>,
                              <DropdownItem
                                key="info"
                                onClick={() => files.showInfo(item.fullName)}
                                startContent={<FaInfo />}
                              >
                                Info
                              </DropdownItem>,
                              <DropdownItem
                                key="download"
                                onClick={() => files.download(item.fullName)}
                                startContent={<FaDownload />}
                              >
                                Download
                              </DropdownItem>,
                              ...(files.isArchiveFile(item.fullName)
                                ? [
                                    <DropdownItem
                                      key="unzip"
                                      onClick={() => files.unpackFile(item.fullName)}
                                      startContent={<FaArchive />}
                                    >
                                      Extract
                                    </DropdownItem>,
                                  ]
                                : []),
                            ]}
                          </DropdownSection>
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        }
      ></HeaderScrollBodyLayout>

      {/* Permission Dialog */}
      {showPermissionsOf && (
        <PermissionModal
          key={"permissions-" + showPermissionsOf?.fullName}
          fileInput={showPermissionsOf}
          id={id}
          onClose={() => setShowPermissionsOf(null)}
        ></PermissionModal>
      )}

      {/* Owner/Group Dialog */}
      {showOwnerOf && (
        <OwnerModal
          key={"owner-group-" + showOwnerOf?.fullName}
          file={showOwnerOf}
          id={id}
          onClose={() => setShowOwnerOf(null)}
        ></OwnerModal>
      )}
    </>
  );
};
