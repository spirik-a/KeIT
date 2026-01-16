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
const RESET_FILE = path.join(
  STORAGE_DIR,
  "password_resets.json"
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
  if (!fs.existsSync(RESET_FILE))
    fs.writeFileSync(RESET_FILE, "[]", "utf-8");
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

function generate6DigitCode() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
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
    return res
      .status(400)
      .json({
        error:
          "Нік: 3-32 символи (латиниця/цифри/._), без пробілів",
      });
  }

  if (!validatePassword(password)) {
    return res
      .status(400)
      .json({
        error:
          "Пароль: мін. 8 символів, великі/малі літери, цифра і спецсимвол",
      });
  }

  const users = readJSON(USERS_FILE, []);

  if (
    users.some((u) => (u.phone || "") === phone)
  ) {
    return res
      .status(409)
      .json({
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
    return res
      .status(400)
      .json({
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

/**
 * POST /users/password-reset/request
 * body: { phone }
 * response (для тесту): { ok: true, code: "123456" }
 */
router.post(
  "/password-reset/request",
  (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (!phone)
      return res
        .status(400)
        .json({ error: "Вкажіть телефон" });

    const users = readJSON(USERS_FILE, []);
    const user = users.find(
      (u) => (u.phone || "") === phone
    );
    if (!user) {
      // Безпечно: не кажемо зловмиснику, що телефону не існує
      return res.json({ ok: true });
    }

    const resets = readJSON(RESET_FILE, []);
    const code = generate6DigitCode();
    const { salt, hash } = hashPassword(code);

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ); // 10 хв

    resets.push({
      id: crypto.randomUUID(),
      userId: user.id,
      phone: user.phone,
      codeSalt: salt,
      codeHash: hash,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    });

    writeJSON(RESET_FILE, resets);

    // Для нульового бюджету: показуємо код в консолі і у відповіді
    console.log(
      `[RESET CODE] phone=${phone} code=${code} (valid 10 min)`
    );

    return res.json({ ok: true, code }); // пізніше при SMS — прибрати "code"
  }
);

/**
 * POST /users/password-reset/confirm
 * body: { phone, code, newPassword }
 */
router.post(
  "/password-reset/confirm",
  (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const code = String(
      req.body?.code || ""
    ).trim();
    const newPassword = req.body?.newPassword;

    if (!phone || !code || !newPassword) {
      return res
        .status(400)
        .json({
          error:
            "Вкажіть телефон, код та новий пароль",
        });
    }

    if (!validatePassword(newPassword)) {
      return res
        .status(400)
        .json({
          error:
            "Пароль: мін. 8 символів, великі/малі літери, цифра і спецсимвол",
        });
    }

    const users = readJSON(USERS_FILE, []);
    const user = users.find(
      (u) => (u.phone || "") === phone
    );
    if (!user)
      return res
        .status(400)
        .json({ error: "Невірні дані" });

    let resets = readJSON(RESET_FILE, []);

    // беремо останній не прострочений
    const now = Date.now();
    const candidates = resets
      .filter(
        (r) =>
          r.userId === user.id &&
          new Date(r.expiresAt).getTime() > now
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

    const reset = candidates[0];
    if (!reset)
      return res
        .status(400)
        .json({
          error:
            "Код прострочений або не запитаний",
        });

    if (reset.attempts >= 5)
      return res
        .status(400)
        .json({
          error:
            "Забагато спроб. Запитайте новий код",
        });

    const ok = verifyPassword(
      code,
      reset.codeSalt,
      reset.codeHash
    );
    if (!ok) {
      // інкремент спроб
      resets = resets.map((r) =>
        r.id === reset.id
          ? { ...r, attempts: r.attempts + 1 }
          : r
      );
      writeJSON(RESET_FILE, resets);
      return res
        .status(400)
        .json({ error: "Невірний код" });
    }

    // оновлюємо пароль
    const { salt, hash } =
      hashPassword(newPassword);
    const updatedUsers = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            passwordSalt: salt,
            passwordHash: hash,
          }
        : u
    );
    writeJSON(USERS_FILE, updatedUsers);

    // чистимо reset-записи цього користувача
    const cleaned = resets.filter(
      (r) => r.userId !== user.id
    );
    writeJSON(RESET_FILE, cleaned);

    return res.json({ ok: true });
  }
);

export default router;
