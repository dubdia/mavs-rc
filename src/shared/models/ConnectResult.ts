import { RemoteDto } from "./RemoteDto";

/** whether the connection could be established or not. if success is true, the remote is set */
export interface ConnectResult {
    success: boolean;
    error?: string;
    remote?: RemoteDto;
}
