import { OsType } from "../../models/OsType";

/** joins the parts in the flavor of given @see os */
export const joinPath = (parts: string[], os: OsType): string => {
    var separator = os == OsType.Windows ? '\\' : '/';
    var replace = new RegExp(separator + '{1,}', 'g');
    return parts.join(separator).replace(replace, separator);
}