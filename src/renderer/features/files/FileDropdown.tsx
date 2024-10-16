import { Dropdown, DropdownTrigger, Button, DropdownMenu, DropdownSection, DropdownItem } from "@nextui-org/react";
import { FaBars } from "react-icons/fa";
import { useFiles } from "./files.hook";
import { SessionFile } from "../../models/SessionFile";

export const FileDropdown = ({ id, file }: { id: string; file: SessionFile }) => {
  const files = useFiles(id);
  return (
    <Dropdown backdrop="blur">
      <DropdownTrigger>
        <Button isIconOnly variant="light" isDisabled={file.loading}>
          <FaBars></FaBars>
        </Button>
      </DropdownTrigger>
      {/* generic actions */}
      <DropdownMenu aria-label="Static Actions">
        <DropdownSection title={file.name}>
          {!file.isNew && (
            <DropdownItem key="Download" onClick={() => files.download(file.filePath)}>
              Download
            </DropdownItem>
          )}
          {!file.isNew && (
            <DropdownItem key="Delete" onClick={() => files.removeFile(file.filePath)}>
              Delete
            </DropdownItem>
          )}
          {!file.isNew && (
            <DropdownItem key="Info" onClick={() => files.showInfo(file.filePath)}>
              Info
            </DropdownItem>
          )}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};
