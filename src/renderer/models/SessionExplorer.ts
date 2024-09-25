import { RemoteFile } from "../../shared/models/RemoteFile";
import { ProcessableList } from "./ProcessableList";

/** state of the react explorer component */
export type SessionExplorer = {
  /** whether the explorer is loading */
  loading: boolean;

  /** the current directory */
  dir: string;
} & ProcessableList<RemoteFile>;
