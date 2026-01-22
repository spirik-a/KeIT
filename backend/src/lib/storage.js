import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_A = path.join(
  __dirname,
  "..",
  "storage"
);
const STORAGE_B = path.join(
  __dirname,
  "..",
  "storadge"
);

function safeReadJSON(file, fallback) {
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf-8")
    );
  } catch {
    return fallback;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir, { recursive: true });
}

function ensureFile(file, defaultContent) {
  if (!fs.existsSync(file))
    fs.writeFileSync(
      file,
      defaultContent,
      "utf-8"
    );
}

function pickStorageDir() {
  const aExists = fs.existsSync(STORAGE_A);
  const bExists = fs.existsSync(STORAGE_B);

  if (aExists && !bExists) return STORAGE_A;
  if (bExists && !aExists) return STORAGE_B;

  if (!aExists && !bExists) {
    ensureDir(STORAGE_A);
    return STORAGE_A;
  }

  const aUsers = path.join(
    STORAGE_A,
    "users.json"
  );
  const bUsers = path.join(
    STORAGE_B,
    "users.json"
  );

  const aList = fs.existsSync(aUsers)
    ? safeReadJSON(aUsers, [])
    : [];
  const bList = fs.existsSync(bUsers)
    ? safeReadJSON(bUsers, [])
    : [];

  if (Array.isArray(aList) && aList.length > 0)
    return STORAGE_A;
  if (Array.isArray(bList) && bList.length > 0)
    return STORAGE_B;

  return STORAGE_A;
}

export const STORAGE_DIR = pickStorageDir();

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

export function ensureStorageFiles() {
  ensureDir(STORAGE_DIR);
  ensureFile(USERS_FILE, "[]");
  ensureFile(SESSIONS_FILE, "[]");
  ensureFile(RESETS_FILE, "[]");
  ensureFile(CONTACTS_FILE, "{}");
  ensureFile(MESSAGES_FILE, "[]");
}

export function readJSON(file, fallback) {
  ensureStorageFiles();
  return safeReadJSON(file, fallback);
}

export function writeJSON(file, data) {
  ensureStorageFiles();
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}
