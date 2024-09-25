/** represents a file, directory, socket, link, pipe on the remote */
export interface RemoteFile {
    fullName?: string | undefined;
    name?: string | undefined;
    lastAccessTime?: number; // Date().getDate()
    lastWriteTime?: number;
    length?: number;
    userId?: number;
    groupId?: number;
    userName?: string | undefined;
    groupName?: string | undefined;
    isSocket?: boolean;
    isSymbolicLink?: boolean;
    isRegularFile?: boolean;
    isBlockDevice?: boolean;
    isDirectory?: boolean;
    isCharacterDevice?: boolean;
    isNamedPipe?: boolean;
    ownerCanRead?: boolean;
    ownerCanWrite?: boolean;
    ownerCanExecute?: boolean;
    groupCanRead?: boolean;
    groupCanWrite?: boolean;
    groupCanExecute?: boolean;
    othersCanRead?: boolean;
    othersCanWrite?: boolean;
    othersCanExecute?: boolean;
}
