import { Button, Divider } from "@nextui-org/react";
import { FaPlus, FaWifi } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../store/store";
import { createNewRemote, selectAll, setActiveId } from "../store/remotesSlice";
import { shallowEqual } from "react-redux";
import { RemoteDto } from "../../shared/models/RemoteDto";

export const RemoteInfoList = () => {
  //onsole.log("RENDER RemoteInfoList");
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => selectAll(state.data).map((x) => x.dto), shallowEqual) as RemoteDto[];
  const activeId = useAppSelector((state) => state.data.activeId);

  return (
    <div className="flex flex-col gap-2">
      {/* Enumerate all existing remotes */}
      {list.map((remote) => (
        <Button
          key={remote.info.id}
          onClick={() => dispatch(setActiveId({ id: remote.info?.id }))}
          variant={remote.info?.id == activeId ? "faded" : "light"}
          size="lg"
          /*color={remote.info?.id == activeId ? "success" : "default"}*/
          className="justify-start"
        >
          {remote.connected && <FaWifi className="text-green-400 shrink-0"></FaWifi>}
          {!remote.connected && <FaWifi className="text-gray-300 shrink-0"></FaWifi>}

          <span className={`truncate ${remote.info?.id == activeId ? "" : "text-gray-200"}`}>{remote.info?.name}</span>
        </Button>
      ))}
      {/* Divider */}
      {list.length > 0 && <Divider></Divider>}

      {/* Link to add new remote */}
      <Button
        key="add-remote"
        variant="light"
        size="lg"
        color="default"
        className="justify-start"
        
        onClick={() => dispatch(createNewRemote())}
      >
        <FaPlus className="text-green-400 shrink-0"></FaPlus>
        <span className="truncate">Add</span>
      </Button>
    </div>
  );
};
