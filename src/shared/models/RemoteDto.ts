import { OsType } from "./OsType";
import { RemoteInfo } from "./RemoteInfo";

/** contains information about a remote used in the renderer */
export interface RemoteDto {
    info: RemoteInfo;
    connected: boolean;
    osType: OsType;
    shellHistory: string[] | undefined;
}
