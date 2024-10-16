import { RemoteFile } from "../models/RemoteFile";
import { UnixGroupPermissions, UnixPermissions } from "./parseUnixPermissions";

export const unixPermissionsToChmod = (permissions: UnixPermissions): string => {
    if(permissions == null) {
        throw new Error('No permissions were given');
    }

    // function to calculate permission number from permission string
    const calculatePermissionNumber = (permissions: UnixGroupPermissions) => {
        let nr = 0;
        if(permissions.read === true) {
            nr += 4;
        }
        if(permissions.write === true) {
            nr += 2;
        }
        if(permissions.execute === true) {
            nr += 1;
        }
        if(permissions.sticky === true) {
            nr += 1;
        }
        return nr;
    };

    // calculate permission numbers
    const userPermissionNumber = calculatePermissionNumber(permissions.owner);
    const groupPermissionNumber = calculatePermissionNumber(permissions.group);
    const otherPermissionNumber = calculatePermissionNumber(permissions.other);

    // construct chmod number
    const chmodNumber = `${userPermissionNumber}${groupPermissionNumber}${otherPermissionNumber}`;
    return chmodNumber;
}

export const sftpFileToChmod = (file: RemoteFile): number => {
    const owner = calculatePermissionNumber(file.ownerCanRead, file.ownerCanWrite, file.ownerCanExecute);
    const group = calculatePermissionNumber(file.groupCanRead, file.groupCanWrite, file.groupCanExecute);
    const other = calculatePermissionNumber(file.othersCanRead, file.othersCanWrite, file.othersCanExecute);

    return +(owner.toString() + group.toString() + other.toString());
}

export const  calculatePermissionNumber = (read: boolean | undefined, write: boolean | undefined, execute: boolean | undefined, sticky?: boolean | undefined) => {
    let nr = 0;
    if(read === true) {
        nr += 4;
    }
    if(write === true) {
        nr += 2;
    }
    if(execute === true) {
        nr += 1;
    }
    if(sticky === true) {
        nr += 1;
    }
    return nr;
};