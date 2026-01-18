import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const router = express.Router();

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

function ensureUsersFile() {
  if (!fs.existsSync(STORAGE_DIR))
    fs.mkdirSync(STORAGE_DIR, {
      recursive: true,
    });
  if (!fs.existsSync(USERS_FILE))
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
}

function readUsers() {
  ensureUsersFile();
  try {
    return JSON.parse(
      fs.readFileSync(USERS_FILE, "utf-8")
    );
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(users, null, 2),
    "utf-8"
  );
}

function validatePassword(p) {
  if (typeof p !== "string") return false;
  if (p.length < 8) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[0-9]/.test(p)) return false;
  if (!/[^A-Za-z0-9]/.test(p)) return false;
  return true;
}

function hashPassword(password) {
  const salt = crypto
    .randomBytes(16)
    .toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return { salt, hash };
}

function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  const provided = req.headers["x-admin-key"];

  if (!adminKey)
    return res
      .status(500)
      .json({
        error: "ADMIN_KEY is not set on server",
      });
  if (
    !provided ||
    String(provided) !== String(adminKey)
  ) {
    return res
      .status(403)
      .json({ error: "Forbidden" });
  }
  next();
}

/**
 * POST /admin/set-password
 * headers: X-Admin-Key: <ADMIN_KEY>
 * body: { phone OR username, newPassword }
 */
router.post(
  "/set-password",
  requireAdmin,
  (req, res) => {
    const phone = String(
      req.body?.phone || ""
    ).trim();
    const username = String(
      req.body?.username || ""
    ).trim();
    const newPassword = req.body?.newPassword;

    if ((!phone && !username) || !newPassword) {
      return res
        .status(400)
        .json({
          error:
            "Provide phone or username and newPassword",
        });
    }

    if (!validatePassword(newPassword)) {
      return res
        .status(400)
        .json({
          error:
            "Password does not meet requirements",
        });
    }

    const users = readUsers();

    const idx = users.findIndex((u) =>
      phone
        ? (u.phone || "") === phone
        : (u.username || "").toLowerCase() ===
          username.toLowerCase()
    );

    if (idx === -1)
      return res
        .status(404)
        .json({ error: "User not found" });

    const { salt, hash } =
      hashPassword(newPassword);
    users[idx].passwordSalt = salt;
    users[idx].passwordHash = hash;
    users[idx].passwordUpdatedAt =
      new Date().toISOString();

    writeUsers(users);

    res.json({
      ok: true,
      user: {
        id: users[idx].id,
        phone: users[idx].phone,
        username: users[idx].username,
      },
    });
  }
);

export default router;
