import { EntityState } from "@reduxjs/toolkit";
import { AsyncStatus } from "./AsyncStatus";
import { Remote } from "./Remote";

/** contains the whole state of the react app inside the renderer process */
export type State = {
    /** contains the remotes */
    data: EntityState<Remote, string>,

    /** status of the remotes */
    dataStatus: AsyncStatus,

    /** error that may have occured during loading of the remotes */
    dataError: string | null,

    /** the id of the remote that is currently displayed - id is one of @see data */
    activeId: string | null,
}