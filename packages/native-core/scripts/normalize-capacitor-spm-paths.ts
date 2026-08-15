/**
 * Single responsibility: keep Capacitor's generated local Swift package paths
 * valid when `cap sync` runs on Windows.
 */
import { readFileSync, writeFileSync } from "node:fs";

const packagePath = "ios/App/CapApp-SPM/Package.swift";
const current = readFileSync(packagePath, "utf8");
const normalized = current.replaceAll("\\", "/");
if (normalized !== current) writeFileSync(packagePath, normalized);
console.log("Capacitor SPM paths use forward slashes.");
