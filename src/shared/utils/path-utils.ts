// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Note: I added types to this code and the function "isRoot"
import os from "os";
import { OsType } from "../models/OsType";

// resolves . and .. elements in a path array with directory names there
// must be no slashes or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts: string[], allowAboveRoot: boolean) {
  var res = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];

    // ignore empty parts
    if (!p || p === ".") continue;

    if (p === "..") {
      if (res.length && res[res.length - 1] !== "..") {
        res.pop();
      } else if (allowAboveRoot) {
        res.push("..");
      }
    } else {
      res.push(p);
    }
  }

  return res;
}

// returns an array with empty elements removed from either end of the input
// array or the original array if no elements need to be removed
function trimArray(arr: string[]) {
  var lastIndex = arr.length - 1;
  var start = 0;
  for (; start <= lastIndex; start++) {
    if (arr[start]) break;
  }

  var end = lastIndex;
  for (; end >= 0; end--) {
    if (arr[end]) break;
  }

  if (start === 0 && end === lastIndex) return arr;
  if (start > end) return [];
  return arr.slice(start, end + 1);
}

// Function to split a filename into [root, dir, basename, ext]
function win32SplitPath(filename: string) {
  // Separate device+slash from tail
  var result = splitDeviceRe.exec(filename),
    device = (result[1] || "") + (result[2] || ""),
    tail = result[3] || "";
  // Split the tail into dir, basename and extension
  var result2 = splitTailRe.exec(tail),
    dir = result2[1],
    basename = result2[2],
    ext = result2[3];
  return [device, dir, basename, ext];
}

function win32StatPath(path: string) {
  var result = splitDeviceRe.exec(path),
    device = result[1] || "",
    isUnc = !!device && device[1] !== ":";
  return {
    device: device,
    isUnc: isUnc,
    isAbsolute: isUnc || !!result[2], // UNC paths are always absolute
    tail: result[3],
  };
}

function normalizeUNCRoot(device: string) {
  return "\\\\" + device.replace(/^[\\\/]+/, "").replace(/[\\\/]+/g, "\\");
}
function posixSplitPath(filename: string) {
  return splitPathRe.exec(filename).slice(1);
}

// Regex to split a windows path into three parts: [*, device, slash,
// tail] windows-only
var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;

// Regex to split the tail part of the above into [*, dir, basename, ext]
var splitTailRe = /^([\s\S]*?)((?:\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))(?:[\\\/]*)$/;

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

export type Path = {
  sep: string;
  delimiter: string;
  resolve: (...parts: string[]) => string;
  normalize: (path: string) => string;
  isAbsolute: (path: string) => boolean;
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
  dirname: (path: string) => string;
  basename: (path: string) => string;
  extname: (path: string, ext?: string) => string;
  format: (pathObject: any) => string;
  parse: (pathString: string) => any;
  makeLong: (path: string) => string;
  isRoot: (path: string) => boolean;
};

/** path functions for windows */
export const win32Path: Path = {
  sep: "\\",
  delimiter: ";",

  resolve: (...parts: string[]) => {
    if (parts == null || parts.length == 0) {
      return "";
    }
    var resolvedDevice = "",
      resolvedTail = "",
      resolvedAbsolute = false;

    for (var i = parts.length - 1; i >= -1; i--) {
      var path;
      if (i >= 0) {
        path = parts[i];
      } else if (!resolvedDevice) {
        path = process.cwd();
      } else {
        // Windows has the concept of drive-specific current working
        // directories. If we've resolved a drive letter but not yet an
        // absolute path, get cwd for that drive. We're sure the device is not
        // an unc path at this points, because unc paths are always absolute.
        path = process.env["=" + resolvedDevice];
        // Verify that a drive-local cwd was found and that it actually points
        // to our drive. If not, default to the drive's root.
        if (!path || path.substr(0, 3).toLowerCase() !== resolvedDevice.toLowerCase() + "\\") {
          path = resolvedDevice + "\\";
        }
      }

      // Skip empty and invalid entries
      if (!path) {
        continue;
      }

      var result = win32StatPath(path),
        device = result.device,
        isUnc = result.isUnc,
        isAbsolute = result.isAbsolute,
        tail = result.tail;

      if (device && resolvedDevice && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
        // This path points to another device so it is not applicable
        continue;
      }

      if (!resolvedDevice) {
        resolvedDevice = device;
      }
      if (!resolvedAbsolute) {
        resolvedTail = tail + "\\" + resolvedTail;
        resolvedAbsolute = isAbsolute;
      }

      if (resolvedDevice && resolvedAbsolute) {
        break;
      }
    }

    // Convert slashes to backslashes when `resolvedDevice` points to an UNC
    // root. Also squash multiple slashes into a single one where appropriate.
    if (isUnc) {
      resolvedDevice = normalizeUNCRoot(resolvedDevice);
    }

    // At this point the path should be resolved to a full absolute path,
    // but handle relative paths to be safe (might happen when process.cwd()
    // fails)

    // Normalize the tail path
    resolvedTail = normalizeArray(resolvedTail.split(/[\\\/]+/), !resolvedAbsolute).join("\\");

    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
  },
  normalize: (path: string) => {
    if (path == null || path == "") {
      return "";
    }
    var result = win32StatPath(path),
      device = result.device,
      isUnc = result.isUnc,
      isAbsolute = result.isAbsolute,
      tail = result.tail,
      trailingSlash = /[\\\/]$/.test(tail);

    // Normalize the tail path
    tail = normalizeArray(tail.split(/[\\\/]+/), !isAbsolute).join("\\");

    if (!tail && !isAbsolute) {
      tail = ".";
    }
    if (tail && trailingSlash) {
      tail += "\\";
    }

    // Convert slashes to backslashes when `device` points to an UNC root.
    // Also squash multiple slashes into a single one where appropriate.
    if (isUnc) {
      device = normalizeUNCRoot(device);
    }

    return device + (isAbsolute ? "\\" : "") + tail;
  },
  isAbsolute: (path: string) => {
    return win32StatPath(path).isAbsolute;
  },
  join: (...parts: string[]) => {
    var paths = [];
    for (var i = 0; i < parts.length; i++) {
      var arg = parts[i];
      if (arg) {
        paths.push(arg);
      }
    }

    var joined = paths.join("\\");

    // Make sure that the joined path doesn't start with two slashes, because
    // normalize() will mistake it for an UNC path then.
    //
    // This step is skipped when it is very clear that the user actually
    // intended to point at an UNC path. This is assumed when the first
    // non-empty string arguments starts with exactly two slashes followed by
    // at least one more non-slash character.
    //
    // Note that for normalize() to treat a path as an UNC path it needs to
    // have at least 2 components, so we don't filter for that here.
    // This means that the user can use join to construct UNC paths from
    // a server name and a share name; for example:
    //   path.join('//server', 'share') -> '\\\\server\\share\')
    if (!/^[\\\/]{2}[^\\\/]/.test(paths[0])) {
      joined = joined.replace(/^[\\\/]{2,}/, "\\");
    }

    return win32Path.normalize(joined);
  },
  relative: (from: string, to: string) => {
    from = win32Path.resolve(from);
    to = win32Path.resolve(to);

    // windows is not case sensitive
    var lowerFrom = from.toLowerCase();
    var lowerTo = to.toLowerCase();

    var toParts = trimArray(to.split("\\"));

    var lowerFromParts = trimArray(lowerFrom.split("\\"));
    var lowerToParts = trimArray(lowerTo.split("\\"));

    var length = Math.min(lowerFromParts.length, lowerToParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (lowerFromParts[i] !== lowerToParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    if (samePartsLength == 0) {
      return to;
    }

    var outputParts = [];
    for (var i = samePartsLength; i < lowerFromParts.length; i++) {
      outputParts.push("..");
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join("\\");
  },
  makeLong: (path: string) => {
    if (!path) {
      return "";
    }

    var resolvedPath = win32Path.resolve(path);

    if (/^[a-zA-Z]\:\\/.test(resolvedPath)) {
      // path is local filesystem path, which needs to be converted
      // to long UNC path.
      return "\\\\?\\" + resolvedPath;
    } else if (/^\\\\[^?.]/.test(resolvedPath)) {
      // path is network UNC path, which needs to be converted
      // to long UNC path.
      return "\\\\?\\UNC\\" + resolvedPath.substring(2);
    }

    return path;
  },
  dirname: (path: string) => {
    var result = win32SplitPath(path),
      root = result[0],
      dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return ".";
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  },
  basename: (path: string, ext?: string) => {
    var f = win32SplitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  },
  extname: (path: string) => {
    return win32SplitPath(path)[3];
  },
  format: (pathObject: any) => {
    var root = pathObject.root || "";
    var dir = pathObject.dir;
    var base = pathObject.base || "";
    if (!dir) {
      return base;
    }
    if (dir[dir.length - 1] === win32Path.sep) {
      return dir + base;
    }
    return dir + win32Path.sep + base;
  },
  parse: (pathString: string) => {
    var allParts = win32SplitPath(pathString);
    if (!allParts || allParts.length !== 4) {
      throw new TypeError("Invalid path '" + pathString + "'");
    }
    return {
      root: allParts[0],
      dir: allParts[0] + allParts[1].slice(0, -1),
      base: allParts[2],
      ext: allParts[3],
      name: allParts[2].slice(0, allParts[2].length - allParts[3].length),
    };
  },
  isRoot: (path: string) => {
    // check
    if (path == null || path == "" || path == "/") {
      return true;
    }

    // Normalize the input to resolve things like 'C:\\' vs 'C:/' and unnecessary './'
    const normalizedPath = win32Path.normalize(path);

    // Get the directory part of the path, excluding the base (last part of the path)
    const parentPath = win32Path.resolve(normalizedPath, "..");

    // Compare normalized original path with its parent
    // If resolving '..' leads to the same path, we are at the root
    return normalizedPath === parentPath;
  },
};
/** path functions for posix */
export const posixPath: Path = {
  sep: "/",
  delimiter: ":",
  resolve: (...parts: string[]) => {
    var resolvedPath = "",
      resolvedAbsolute = false;

    for (var i = parts.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? parts[i] : process.cwd();

      // Skip empty and invalid entries
      if (!path) {
        continue;
      }

      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = path[0] === "/";
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(resolvedPath.split("/"), !resolvedAbsolute).join("/");

    return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
  },
  normalize: (path: string) => {
    var isAbsolute = posixPath.isAbsolute(path),
      trailingSlash = path && path[path.length - 1] === "/";

    // Normalize the path
    path = normalizeArray(path.split("/"), !isAbsolute).join("/");

    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }

    return (isAbsolute ? "/" : "") + path;
  },
  isAbsolute: (path: string) => {
    return path.charAt(0) === "/";
  },
  join: (...parts: string[]) => {
    var path = "";
    for (var i = 0; i < parts.length; i++) {
      var segment = parts[i];
      if (segment) {
        if (!path) {
          path += segment;
        } else {
          path += "/" + segment;
        }
      }
    }
    return posixPath.normalize(path);
  },
  relative: (from: string, to: string) => {
    from = posixPath.resolve(from).substr(1);
    to = posixPath.resolve(to).substr(1);

    var fromParts = trimArray(from.split("/"));
    var toParts = trimArray(to.split("/"));

    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join("/");
  },
  makeLong: (path: string) => {
    return path;
  },
  dirname: (path: string) => {
    var result = posixSplitPath(path),
      root = result[0],
      dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return ".";
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  },
  basename: (path: string, ext?: string) => {
    var f = posixSplitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  },
  extname: (path: string) => {
    return posixSplitPath(path)[3];
  },
  format: (pathObject: any) => {
    var root = pathObject.root || "";

    var dir = pathObject.dir ? pathObject.dir + posixPath.sep : "";
    var base = pathObject.base || "";
    return dir + base;
  },
  parse: (pathString: string) => {
    var allParts = posixSplitPath(pathString);
    if (!allParts || allParts.length !== 4) {
      throw new TypeError("Invalid path '" + pathString + "'");
    }
    allParts[1] = allParts[1] || "";
    allParts[2] = allParts[2] || "";
    allParts[3] = allParts[3] || "";

    return {
      root: allParts[0],
      dir: allParts[0] + allParts[1].slice(0, -1),
      base: allParts[2],
      ext: allParts[3],
      name: allParts[2].slice(0, allParts[2].length - allParts[3].length),
    };
  },
  isRoot: (path: string) => {
    // check
    if (path == null || path == "") {
      return true;
    }

    // Normalize the input to resolve things like 'C:\\' vs 'C:/' and unnecessary './'
    const normalizedPath = posixPath.normalize(path);

    // Get the directory part of the path, excluding the base (last part of the path)
    const parentPath = posixPath.resolve(normalizedPath, "..");

    // Compare normalized original path with its parent
    // If resolving '..' leads to the same path, we are at the root
    return normalizedPath === parentPath;
  },
};

/** returns win32 or posix path fucntions depending on the current os.platform (this is not working in the browser/renderer!) */
export const currentPath = () => {
  const currentPlatform = os.platform();
  return currentPlatform == "win32" ? win32Path : posixPath;
  
}

/** returns win32 or posix path functions depending on given type */
export const getPath = (type: "win32" | "posix" | "current"): Path => {
  if (type == "win32") {
    return win32Path;
  } else if (type == "posix") {
    return posixPath;
  } else if (type == "current") {
    return currentPath();
  } else {
    throw new Error(`Unknown type. Could not resolve path class for '${type}'`);
  }
};

export const getPathForOsType = (osType: OsType): Path => {
  if (osType == OsType.Windows) {
    return getPath("win32");
  } else {
    return getPath("posix");
  }
};
