import { OsType } from "../../shared/models/OsType";
import { getPathForOsType } from "../../shared/utils/path-utils";
import { TabName } from "./TabName";

/** the state of the react file component (a opened file) */
export type SessionFile = {
  /** identifier of the tab */
  tab: TabName;

  /** name of the tab */
  name: string;

  /** path to the file on the remote */
  filePath: string;

  /** when closing the tab, what tab should be selected instead */
  onCloseNavigateBackTo: TabName | null | undefined;

  /** whether the file is new */
  isNew: boolean;

  /** type of file (for service, special actions are shown) */
  type: "Service" | "File";

  /** whether the file is loading */
  loading: boolean;

  /** contents */
  contents: string;

  /** original contents used for change detection */
  originalContents: string;
};

/** factory function to create a new @see RemoteFile using given parameters */
export const createFile = ({
  tab,
  filePath,
  onCloseNavigateBackTo,
  isNew,
  contents,
  osType,
}: {
  tab: TabName;
  filePath: string;
  onCloseNavigateBackTo: TabName | null | undefined;
  isNew: boolean;
  contents: string;
  osType: OsType
}): SessionFile => {
  return {
    tab: tab,
    filePath: filePath,
    name: getPathForOsType(osType).basename(filePath),
    onCloseNavigateBackTo: onCloseNavigateBackTo,
    isNew: isNew,
    type: filePath?.endsWith(".service") ? "Service" : "File",
    loading: false,

    contents: contents,
    originalContents: JSON.parse(JSON.stringify(contents)),
  };
};
