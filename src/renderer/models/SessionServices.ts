import { ProcessableList } from "./ProcessableList";
import { SessionService } from "./SessionService";

/** state of the react services component */
export type SessionServices = {
  /** whether services are loading */
  loading: boolean;
} & ProcessableList<SessionService>;
