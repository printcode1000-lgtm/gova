/**
 * Single responsibility: repair Capacitor's generated Swift package after
 * `cap sync` by normalizing local paths and restoring ASOL native-core wiring.
 */
import { readFileSync, writeFileSync } from "node:fs";

const packagePath = "ios/App/CapApp-SPM/Package.swift";
const nativePackage = '.package(name: "AsolNativeCore", path: "../../../packages/native-core/ios")';
const nativeProduct = '.product(name: "AsolNativeCore", package: "AsolNativeCore")';

function insertListEntry(source: string, anchor: string, entry: string, indent: string, label: string): string {
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error(`Cannot restore ${label}; Capacitor Package.swift shape changed.`);
  const before = source.slice(0, index).trimEnd();
  const comma = before.endsWith(",") ? "" : ",";
  return `${before}${comma}\n${indent}${entry}\n${source.slice(index)}`;
}

const current = readFileSync(packagePath, "utf8");
let repaired = current
  .replaceAll("\\", "/")
  .split("\n")
  .filter((line) => !line.includes(nativePackage) && !line.includes(nativeProduct))
  .join("\n");
repaired = insertListEntry(
  repaired,
  "    ],\n    targets: [",
  nativePackage,
  "        ",
  "AsolNativeCore package dependency",
);
repaired = insertListEntry(
  repaired,
  "            ]\n        )\n    ]\n)",
  nativeProduct,
  "                ",
  "AsolNativeCore product dependency",
);

if (repaired !== current) writeFileSync(packagePath, repaired);
console.log("Capacitor SPM paths and AsolNativeCore wiring are normalized.");
