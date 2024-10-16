import { Dropdown, DropdownTrigger, Button, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { FaStar } from "react-icons/fa";
import { useRemoteSelector } from "../../store/store";
import { FaXmark } from "react-icons/fa6";
import { useShortcuts } from "./shortcuts.hook";
import { RemoteShortcutType } from "../../../shared/models/RemoteShortcutType";

export const ShortcutsDropdown = ({ id, type }: { id: string; type: RemoteShortcutType }) => {
  const shortcuts = useShortcuts(id);
  const list = useRemoteSelector(id, (remote) => remote.session.shortcuts.shortcuts.filter((x) => x.type == type));

  if (list == null || list.length == 0) {
    return <></>;
  }

  return (
    <Dropdown backdrop="blur">
      <DropdownTrigger>
        {/*  <Badge content={list.length} color="default" showOutline={false}>*/}
        <Button isIconOnly variant="flat">
          <FaStar></FaStar>
        </Button>
      </DropdownTrigger>
      {/* generic actions */}
      <DropdownMenu aria-label="Static Actions">
        {list.map((x) => (
          <DropdownItem
            key={x.name}
            description={x.value}
            onClick={() => shortcuts.executeShortcut(x)}
            endContent={<FaXmark onClick={() => shortcuts.removeShortcut(x)}></FaXmark>}
          >
            {x.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
