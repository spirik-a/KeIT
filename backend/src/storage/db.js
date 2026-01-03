import fs from "fs";
import path from "path";

const basePath = path.resolve("src/storage");

function filePath(name) {
  return path.join(basePath, name);
}

export function readJSON(name) {
  const data = fs.readFileSync(
    filePath(name),
    "utf-8"
  );
  return JSON.parse(data);
}

export function writeJSON(name, data) {
  fs.writeFileSync(
    filePath(name),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}
