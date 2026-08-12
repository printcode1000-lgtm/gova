import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const files = process.argv.slice(2).map((file) => path.resolve(file));
if (files.length === 0) throw new Error("Pass one or more TypeScript files");

const versions = new Map(files.map((file) => [file, "0"]));
const service = ts.createLanguageService({
  getScriptFileNames: () => files,
  getScriptVersion: (fileName) => versions.get(path.resolve(fileName)) ?? "0",
  getScriptSnapshot: (fileName) => {
    if (!fs.existsSync(fileName)) return undefined;
    return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf8"));
  },
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => ({
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
  }),
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
});

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const changes = service.organizeImports(
    { type: "file", fileName: file },
    {},
    {},
  );
  const edits = changes.flatMap((change) => change.textChanges);
  for (const edit of edits.sort((left, right) => right.span.start - left.span.start)) {
    text =
      text.slice(0, edit.span.start) +
      edit.newText +
      text.slice(edit.span.start + edit.span.length);
  }
  fs.writeFileSync(file, text, "utf8");
}

console.log(`Organized imports in ${files.length} file(s).`);
