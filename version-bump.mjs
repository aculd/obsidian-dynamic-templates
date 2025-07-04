import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

const newVersion = manifest.version;

versions[newVersion] = manifest.minAppVersion;

writeFileSync("versions.json", JSON.stringify(versions, null, "\t")); 