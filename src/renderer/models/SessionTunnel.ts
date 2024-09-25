import { RemoteTunnelDto } from "../../shared/models/RemoteTunnelDto";
import { ProcessableList } from "./ProcessableList";

/** information about tunnels of the remote */
export type SessionTunnel = {
  /** whether tunnels are loading */
  loading: boolean;

  /** id of the tunnel that is currently beeing edited */
  editTunnelId: string | null;
} & ProcessableList<RemoteTunnelDto>;
