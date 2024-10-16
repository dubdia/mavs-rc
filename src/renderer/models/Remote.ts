import { RemoteDto } from "../../shared/models/RemoteDto";
import { createRemoteSession, Session } from "./Session";

/** represents a remote in the state of the react app (in the renderer process) */
export type Remote = {
  /** id of the remote */
  id: string;

  /** the dto from the api */
  dto: RemoteDto;

  /** react side session information of the remote */
  session: Session;
};

/** factory function to create a new @see Remote from given @see dto */
export const createRemote = (dto: RemoteDto): Remote => {
  return {
    id: dto.info.id,
    dto: dto,
    session: createRemoteSession(dto),
  };
};
