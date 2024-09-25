import { RemoteFile } from "../models/RemoteFile";

export type UnixType = ('Directory' | 'File' | 'Symbolic Link' | 'Named Pipe' | 'Socket' | 'Block Device' | 'Character Device' | 'Unknown');
export type UnixGroupPermissions = {
    read: boolean,
    write: boolean,
    execute: boolean,
    sticky?: boolean
}
export type UnixPermissions = {
    type: UnixType,
    owner: UnixGroupPermissions,
    group: UnixGroupPermissions,
    other: UnixGroupPermissions,
};

export const parseUnixPermissions = (str: string): UnixPermissions => {
    if (str.length !== 10) {
        throw new Error('Invalid Unix permission string. It should be 10 characters long.');
    }

    const type = {
        'd': 'Directory' as UnixType,
        '-': 'File' as UnixType,
        'l': 'Symbolic Link' as UnixType,
        'p': 'Named Pipe' as UnixType,
        's': 'Socket' as UnixType,
        'b': 'Block Device' as UnixType,
        'c': 'Character Device' as UnixType,
    }[str[0]] || 'Unknown';

    const ownerPermissions = {
        read: str[1] == 'r',
        write: str[2] == 'w',
        execute: str[3] == 'x',
    } as UnixGroupPermissions;

    const groupPermissions = {
        read: str[4] == 'r',
        write: str[5] == 'w',
        execute: str[6] == 'x',
    };

    const otherPermissions = {
        read: str[7] == 'r',
        write: str[8] == 'w',
        execute: str[9] == 'x' || str[9] == 't',
        sticky: str[9] == 't'
    };

    return {
        type: type,
        owner: ownerPermissions,
        group: groupPermissions,
        other: otherPermissions
    };
}


export const getPermissionsText = (file: RemoteFile): string => {
    let p = '';
    if (file.ownerCanRead == true) { p += 'r' } else { p += '-' };
    if (file.ownerCanWrite == true) { p += 'w' } else { p += '-' };
    if (file.ownerCanExecute == true) { p += 'x' } else { p += '-' };

    if (file.groupCanRead == true) { p += 'r' } else { p += '-' };
    if (file.groupCanWrite == true) { p += 'w' } else { p += '-' };
    if (file.groupCanExecute == true) { p += 'x' } else { p += '-' };

    if (file.othersCanRead == true) { p += 'r' } else { p += '-' };
    if (file.othersCanWrite == true) { p += 'w' } else { p += '-' };
    if (file.othersCanExecute == true) { p += 'x' } else { p += '-' };

    return p;
}