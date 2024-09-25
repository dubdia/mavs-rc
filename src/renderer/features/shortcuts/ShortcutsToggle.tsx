import { Button } from "@nextui-org/react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { useRemoteSelector } from "../../store/store";
import { useShortcuts } from "./shortcuts.hook";
import { RemoteShortcutType } from "../../../shared/models/RemoteShortcutType";

export const ShortcutsToggle = ({ id, type, value }: { id: string; type: RemoteShortcutType; value: string }) => {
  const shortcut = useRemoteSelector(id, (remote) =>
    remote.session.shortcuts.shortcuts.find((x) => x.type == type && x.value == value)
  );
  const shortcuts = useShortcuts(id);

  const handleClick = () => {
    if(shortcut == null) {
      shortcuts.newShortcut(value, type);
    } else {
      shortcuts.removeShortcut(shortcut);
    }
  }

  return (
    <Button isIconOnly variant="light" onClick={handleClick}>
      {shortcut != null && <FaStar ></FaStar>}
      {shortcut == null && <FaRegStar></FaRegStar>}
    </Button>
  );
};
