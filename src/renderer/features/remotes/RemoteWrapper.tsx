import clsx from "clsx";
import { useAppSelector, useRemoteSelector } from "../../store/store";
import { RemoteConnected } from "./RemoteConnected";
import { RemoteDisconnected } from "./RemoteDisconnected";

export const RemoteWrapper = ({ id }: { id: string }) => {
  console.log("RENDER RemoteWrapper", id);

  const isActive = useAppSelector((state) => state.data.activeId == id);
  const remoteConnected = useRemoteSelector(id, (r) => r?.dto?.connected);

  // set content
  let content = <div></div>;
  if (remoteConnected == null) {
    content = <p>Error: Remote not found: {id}</p>;
  } else if (remoteConnected == true) {
    content = <RemoteConnected key={"connected-" + id} id={id}></RemoteConnected>;
  } else {
    content = <RemoteDisconnected key={"disconnected" + id} id={id}></RemoteDisconnected>;
  }

  // render
  return <div className={clsx(isActive === false && "hidden", isActive === true && "block")}>{content}</div>;
};
