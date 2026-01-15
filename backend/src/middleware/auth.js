import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(
  __dirname,
  "..",
  "storage"
);
const USERS_FILE = path.join(
  STORAGE_DIR,
  "users.json"
);
const SESSIONS_FILE = path.join(
  STORAGE_DIR,
  "sessions.json"
);

function safeReadJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
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
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Unauthorized" });
  }

  const sessions = safeReadJSON(
    SESSIONS_FILE,
    []
  );
  const session = sessions.find(
    (s) => s.token === token
  );

  if (!session) {
    return res
      .status(401)
      .json({ error: "Invalid session" });
  }

  const users = safeReadJSON(USERS_FILE, []);
  const user = users.find(
    (u) => u.id === session.userId
  );

  if (!user) {
    return res
      .status(401)
      .json({ error: "User not found" });
  }

  req.user = user; // {id, phone, name, username, role, balance, ...}
  next();
}
