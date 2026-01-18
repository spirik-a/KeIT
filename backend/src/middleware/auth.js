import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveStorageDir() {
  const a = path.join(__dirname, "..", "storage");
  const b = path.join(
    __dirname,
    "..",
    "storadge"
  );
  if (fs.existsSync(a)) return a;
  if (fs.existsSync(b)) return b;
  fs.mkdirSync(a, { recursive: true });
  return a;
}

const STORAGE_DIR = resolveStorageDir();
const USERS_FILE = path.join(
  STORAGE_DIR,
  "users.json"
);
const SESSIONS_FILE = path.join(
  STORAGE_DIR,
  "sessions.json"
);

function ensureFiles() {
  if (!fs.existsSync(STORAGE_DIR))
    fs.mkdirSync(STORAGE_DIR, {
      recursive: true,
    });
  if (!fs.existsSync(USERS_FILE))
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  if (!fs.existsSync(SESSIONS_FILE))
    fs.writeFileSync(
      SESSIONS_FILE,
      "[]",
      "utf-8"
    );
}

function readJSON(file, fallback) {
  ensureFiles();
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf-8")
    );
  } catch {
    return fallback;
  }
}

export default function authMiddleware(
  req,
  res,
  next
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  if (!token)
    return res
      .status(401)
      .json({ error: "Unauthorized" });

  const sessions = readJSON(SESSIONS_FILE, []);
  const session = sessions.find(
    (s) => s.token === token
  );
  if (!session)
    return res
      .status(401)
      .json({ error: "Invalid session" });

  const users = readJSON(USERS_FILE, []);
  const user = users.find(
    (u) => u.id === session.userId
  );
  if (!user)
    return res
      .status(401)
      .json({ error: "User not found" });

  req.user = user;
  next();
}
