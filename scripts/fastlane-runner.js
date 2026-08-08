const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rubyBin = process.env.RUBY_BIN || "C:\\Ruby33-x64\\bin";
const bundleCandidates =
  process.platform === "win32"
    ? [
        path.join(rubyBin, "bundle.bat"),
        path.join(rubyBin, "bundle.cmd"),
        ...String(process.env.PATH || "")
          .split(path.delimiter)
          .flatMap((directory) => [path.join(directory, "bundle.cmd"), path.join(directory, "bundle.bat")]),
      ]
    : String(process.env.PATH || "")
        .split(path.delimiter)
        .map((directory) => path.join(directory, "bundle"));
const bundle = bundleCandidates.find((candidate) => existsSync(candidate));

if (!bundle) {
  console.error("Bundler was not found. Install Ruby + Bundler before running fastlane.");
  process.exit(1);
}

const args = process.argv.slice(2);
const env = {
  ...process.env,
  LANG: process.env.LANG || "en_US.UTF-8",
  LC_ALL: process.env.LC_ALL || "en_US.UTF-8",
  FASTLANE_SKIP_UPDATE_CHECK: process.env.FASTLANE_SKIP_UPDATE_CHECK || "1",
  PATH: `${rubyBin}${path.delimiter}${process.env.PATH || ""}`,
};
const result = spawnSync(bundle, ["exec", "fastlane", ...args], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
