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
  ); // якщо у тебе папка так названа
  if (fs.existsSync(a)) return a;
  if (fs.existsSync(b)) return b;
  // якщо жодної немає — створюємо правильну "storage"
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

function writeJSON(file, data) {
  ensureFiles();
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function normalizeUsername(username) {
  return String(username || "").trim();
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

function verifyPassword(password, salt, hash) {
  const test = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(test, "hex"),
    Buffer.from(hash, "hex")
  );
}

/**
 * POST /users/register
 * body: { phone, name, username, password }
 */
router.post("/register", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const name = String(
    req.body?.name || ""
  ).trim();
  const username = normalizeUsername(
    req.body?.username
  );
  const password = req.body?.password;

  if (!phone || !name || !username || !password) {
    return res
      .status(400)
      .json({ error: "Заповніть усі поля" });
  }

  if (!/^[a-zA-Z0-9_.]{3,32}$/.test(username)) {
    return res.status(400).json({
      error:
        "Нік: 3-32 символи (латиниця/цифри/._), без пробілів",
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      error:
        "Пароль: мін. 8 символів, великі/малі літери, цифра і спецсимвол",
    });
  }

  const users = readJSON(USERS_FILE, []);

  if (
    users.some((u) => (u.phone || "") === phone)
  ) {
    return res.status(409).json({
      error: "Цей телефон вже зареєстровано",
    });
  }

  if (
    users.some(
      (u) =>
        (u.username || "").toLowerCase() ===
        username.toLowerCase()
    )
  ) {
    return res
      .status(409)
      .json({ error: "Цей нік вже зайнято" });
  }

  const { salt, hash } = hashPassword(password);

  const user = {
    id: crypto.randomUUID(),
    phone,
    name,
    username,
    role: "basic",
    balance: 0,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeJSON(USERS_FILE, users);

  return res.status(201).json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    username: user.username,
    role: user.role,
    balance: user.balance,
    createdAt: user.createdAt,
  });
});

/**
 * POST /users/login
 * body: { phone, password }
 * response: { token, user }
 */
router.post("/login", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password;

  if (!phone || !password) {
    return res.status(400).json({
      error: "Вкажіть телефон і пароль",
    });
  }

  const users = readJSON(USERS_FILE, []);
  const user = users.find(
    (u) => (u.phone || "") === phone
  );

  if (!user)
    return res
      .status(404)
      .json({ error: "Користувача не знайдено" });

  const ok = verifyPassword(
    password,
    user.passwordSalt,
    user.passwordHash
  );
  if (!ok)
    return res
      .status(401)
      .json({ error: "Невірний пароль" });

  const sessions = readJSON(SESSIONS_FILE, []);
  const token = crypto.randomUUID();
  const now = new Date();

  sessions.push({
    token,
    userId: user.id,
    username: user.username,
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
  });

  writeJSON(SESSIONS_FILE, sessions);

  return res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      username: user.username,
      role: user.role,
      balance: user.balance,
    },
  });
});

export default router;
