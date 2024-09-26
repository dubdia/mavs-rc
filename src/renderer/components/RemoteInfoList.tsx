import { Button } from "@nextui-org/react";
import { FaWifi } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../store/store";
import { createNewRemote, selectAll, setActiveId } from "../store/remotesSlice";
import { shallowEqual } from "react-redux";
import { RemoteDto } from "../../shared/models/RemoteDto";

export const RemoteInfoList = () => {
  console.log("RENDER RemoteInfoList");
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => selectAll(state.data).map((x) => x.dto), shallowEqual) as RemoteDto[];
  const activeId = useAppSelector((state) => state.data.activeId);

  return (
    <div className="flex flex-col gap-2">
      {/* Enumerate all existing remotes */}
      {list.map((remote) => (
        <Button
          key={remote.info!.id}
          onClick={() => dispatch(setActiveId({ id: remote.info?.id! }))}
          variant="light"
          size="lg"
          color={remote.info?.id == activeId ? "primary" : "default"}
          className="justify-start"
        >
          {remote.connected && <FaWifi className="text-green-400 shrink-0"></FaWifi>}
          {!remote.connected && <FaWifi className="text-gray-300 shrink-0"></FaWifi>}

          <span className="truncate">{remote.info?.name}</span>
        </Button>
      ))}

      {/* Link to add new remote */}
      <Button key="add-remote" variant="flat" size="lg" color="success" onClick={() => dispatch(createNewRemote())}>
        Add remote
      </Button>
    </div>
  );
};
