/** represents the connection information of a ssh tunnel - this information is stored in the configuration file */
export interface RemoteTunnelInfo {
  id: string;
  name: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  socks: boolean;
  autoConnectOnLogin: boolean;
}
