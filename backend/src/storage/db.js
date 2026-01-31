import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Твій storage: backend/src/storage
export const STORAGE_DIR = __dirname;

// JSON-файли
export const USERS_FILE = path.join(
  STORAGE_DIR,
  "users.json"
);
export const SESSIONS_FILE = path.join(
  STORAGE_DIR,
  "sessions.json"
);
export const RESETS_FILE = path.join(
  STORAGE_DIR,
  "password_resets.json"
);
export const CONTACTS_FILE = path.join(
  STORAGE_DIR,
  "contacts.json"
);
export const MESSAGES_FILE = path.join(
  STORAGE_DIR,
  "messages.json"
);

function ensureFile(file, defaultContent) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      defaultContent,
      "utf-8"
    );
  }
}

export function ensureStorageFiles() {
  ensureFile(USERS_FILE, "[]");
  ensureFile(SESSIONS_FILE, "[]");
  ensureFile(RESETS_FILE, "[]");
  ensureFile(CONTACTS_FILE, "{}");
  ensureFile(MESSAGES_FILE, "[]");
}

export function readJSON(file, fallback) {
  ensureStorageFiles();
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf-8")
    );
  } catch {
    return fallback;
  }
}

export function writeJSON(file, data) {
  ensureStorageFiles();
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}
