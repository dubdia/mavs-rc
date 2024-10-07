import { RemoteTunnelInfo } from "./RemoteTunnelInfo";

/** represents a ssh tunnel for the renderer */
export interface RemoteTunnelDto {
    info?: RemoteTunnelInfo;
    connected: boolean;
}

