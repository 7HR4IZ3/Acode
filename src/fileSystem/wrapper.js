import fs from ".";
import Url from "utils/Url";

export class FileError extends Error {
  constructor(code, ...params) {
    super(params.map(String).join(" "));

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileError);
    }

    this.name = "FileError";
    this.code = code;
  }
}

export class AcodeFSWrapper {
  #promises;

  constructor() {
    this.#promises = new AcodeFSPromisesWrapper();
  }

  get promises() {
    return this.#promises;
  }
  
  readFile(filepath, opts, resolve, reject) {
    return this.#promises.readFile(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT

  writeFile(filepath, data, opts, resolve, reject) {
    return this.#promises.writeFile(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT

  unlink(filepath, opts, resolve, reject) {
    return this.#promises.unlink(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT

  readdir(filepath, opts, resolve, reject) {
    return this.#promises.readdir(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT, ENOTDIR

  mkdir(filepath, opts, resolve, reject) {
    return this.#promises.mkdir(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT, EEXIST

  rmdir(filepath, opts, resolve, reject) {
    return this.#promises.rmdir(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT, ENOTDIR, ENOTEMPTY

  exists(filepath, resolve, reject) {
    return this.#promises.exists(filepath, opts)
      .then(resolve).catch(reject);
  }

  stat(filepath, opts, resolve, reject) {
    return this.#promises.stat(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT

  lstat(filepath, opts, resolve, reject) {
    return this.stat(filepath, opts, resolve, reject);
  } // throws ENOENT

  rename(oldFilepath, newFilepath, resolve, reject) {
    return this.#promises.rename(oldFilepath, newFilepath)
      .then(resolve).catch(reject);
  } // throws ENOENT

  readlink(filepath, opts, resolve, reject) {
    return this.#promises.readlink(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT

  symlink(target, filepath, resolve, reject) {
    return this.#promises.symlink(filepath, opts)
      .then(resolve).catch(reject);
  } // throws ENOENT
}

export class AcodeFSPromisesWrapper {
  #inodes;
  DEBUG = false;

  constructor() {
    this.#inodes = new Map();
  }

  #generateInode(filepath) {
    let inode = this.#inodes.get(filepath);
    if (!inode) {
      inode = "";
      for (let i = 0; i < 6; i++) {
        inode = inode + String(Math.floor(Math.random() * 9));
      }
      inode = Number(inode);
      this.#inodes.set(filepath, inode);
    }
    return inode;
  }

  async readFile(filepath, opts) {
    this.DEBUG && console.log("readFile", filepath, opts);

    if (await fs?.(filepath).exists()) {
      return await fs?.(filepath).readFile(opts?.encoding);
    } else {
      throw new FileError("ENOENT", filepath);
    }
  } // throws ENOENT

  async writeFile(filepath, data, opts) {
    this.DEBUG && console.log("writeFile", filepath, data);

    if (!(await fs?.(Url.dirname(filepath)).exists())) {
      throw new FileError("ENOENT", filepath, "Path Not Found");
    }

    let isBuffer = false;
    if (typeof data !== "string") {
      data = data.toString(opts?.encoding || "utf-8");
      isBuffer = true;
    }

    if (await fs?.(filepath).exists()) {
      await fs?.(filepath).writeFile(
        data, isBuffer
          ? undefined
          : opts?.encoding
      );
    } else {
      await fs?.(Url.dirname(filepath)).createFile(
        Url.basename(filepath), data, isBuffer
          ? undefined : opts?.encoding
      );
    }
  } // throws ENOENT

  async unlink(filepath, opts) {
    this.DEBUG && console.log("unlink", filepath);
    if (await fs?.(filepath).exists()) {
      return await fs?.(filepath).delete();
    }
    throw new FileError("ENOENT", filepath, "Path Not Found");
  } // throws ENOENT

  async readdir(filepath, opts) {
    this.DEBUG && console.log("readdir", filepath);
    if (!(await fs?.(Url.dirname(filepath)).exists())) {
      throw new FileError("ENOENT", filepath, "Path Not Found");
    }

    if (await fs?.(filepath).exists()) {
      let stat = await fs?.(filepath).stat();
      if (stat.isDirectory) {
        return (await fs?.(filepath).lsDir()).map(i => i.name);
      }
      throw new FileError("ENOTDIR", filepath, "Not A Directory");
    }
    throw new FileError("ENOENT", filepath, "Path Not Found");
  } // throws ENOENT, ENOTDIR

  async mkdir(filepath, opts) {
    this.DEBUG && console.log("mkdir", filepath);

    if (!(await fs?.(Url.dirname(filepath)).exists())) {
      throw new FileError("ENOENT", filepath, "Path Not Found");
    }

    if (!(await fs?.(filepath).exists())) {
      return await fs?.(Url.dirname(filepath)).createDirectory(
        Url.basename(filepath)
      );
    }
    throw new FileError("EEXIST", filepath, "Directory Already Exists");
  } // throws ENOENT, EEXIST

  async rmdir(filepath, opts) {
    this.DEBUG && console.log("rmdir", filepath);

    if (await fs?.(filepath).exists()) {
      let stat = await fs?.(filepath).stat();
      if (stat.isDirectory) {
        if ((await fs?.(filepath).lsDir()).length === 0) {
          return await fs?.(filepath).delete();
        }
        throw new FileError("ENOTEMPTY", filePath, "Directory Not Empty");
      }
      throw new FileError("ENOTDIR", filepath, "Not A Directory");
    }
    throw new FileError("ENOENT", filePath, "Path Not Found");
  } // throws ENOENT, ENOTDIR, ENOTEMPTY

  async exists(filepath) {
    return await fs?.(filepath).exists();
  }

  // recommended - often necessary for apps to work
  async stat(filepath, opts) {
    this.DEBUG && console.log("stat", filepath);

    if (await fs?.(filepath).exists()) {
      let stat = await fs?.(filepath).stat();
      return {
        isDirectory: () => stat.isDirectory,
        isFile: () => stat.isFile,
        isSymbolicLink: () => false,

        type: stat.isDirectory ? "dir" : "file",
        size: stat.length,
        ino: this.#generateInode(filepath),
        mode: stat.isDirectory ? 16822 : 33206,
        ctime: stat.lastModified,
        mtime: stat.lastModified
      };
    }
    throw new FileError("ENOENT", filepath, "Path Not Found");
  } // throws ENOENT

  lstat(filepath, opts) {
    return this.stat(filepath, opts);
  } // throws ENOENT

  // suggested - used occasionally by apps
  async rename(oldFilepath, newFilepath) {
    this.DEBUG && console.log("rename", oldFilepath, newFilepath);
    oldFilepath = this.relativePath(oldFilepath);
    newFilepath = this.relativePath(newFilepath);

    if (await fs?.(oldFilepath).exists()) {
      return await fs?.(oldFilepath).renameTo(Url.basename(newFilepath));
    }
    throw new FileError("ENOENT", oldFilepath, "Path Not Found");
  } // throws ENOENT

  readlink(filepath, opts) {
    this.DEBUG && console.log("readlink", filepath);
    return this.readFile(filepath, opts);
  } // throws ENOENT

  symlink(target, filepath) {
    this.DEBUG && console.log("Symlink", target, filepath);
  } // throws ENOENT
}

let fsWrapper = new AcodeFSWrapper();

export const promises = fsWrapper.promises;
export default fsWrapper;
