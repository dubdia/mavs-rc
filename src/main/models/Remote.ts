import { RemoteInfo } from "../../shared/models/RemoteInfo";
import { RemoteConnection } from "./RemoteConnection";

/** represents the state of a remote in the main */
export interface Remote {
  info: RemoteInfo;
  connection?: RemoteConnection;
}