import { Script } from "../../main/models/Script";
import { ProcessableList } from "./ProcessableList";

/** contains a list of all scripts */
export type ScriptList = {
    /** whether scripts are loading */
    loading: boolean;
  
    /** id of the tunnel that is currently beeing edited */
    editScriptId: string | null;
  } & ProcessableList<Script>;
  