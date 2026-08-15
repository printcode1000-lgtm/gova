import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const filesystemAdapter = {
  existsSync: (p: string) => fs.existsSync(p),
  readFileSync: (p: string, encoding: BufferEncoding = "utf8") => fs.readFileSync(p, encoding),
  writeFileSync: (p: string, data: string | NodeJS.ArrayBufferView, encoding: BufferEncoding = "utf8") => fs.writeFileSync(p, data, encoding),
  readFile: (p: string, encoding: BufferEncoding = "utf8") => fsp.readFile(p, encoding),
  writeFile: (p: string, data: string | NodeJS.ArrayBufferView, encoding: BufferEncoding = "utf8") => fsp.writeFile(p, data, encoding),
  mkdir: (p: string, options?: fs.MakeDirectoryOptions) => fsp.mkdir(p, options),
  readdir: (p: string) => fsp.readdir(p),
  stat: (p: string) => fsp.stat(p),
  rm: (p: string, options?: fs.RmOptions) => fsp.rm(p, options),
  copyFile: (src: string, dest: string) => fsp.copyFile(src, dest),
  resolve: (...paths: string[]) => path.resolve(...paths),
  join: (...paths: string[]) => path.join(...paths),
  relative: (from: string, to: string) => path.relative(from, to),
};
