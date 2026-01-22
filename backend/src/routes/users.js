import express from "express";
import crypto from "crypto";
import {
  USERS_FILE,
  SESSIONS_FILE,
  RESETS_FILE,
  readJSON,
  writeJSON,
} from "../lib/storage.js";

const router = express.Router();

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
    users.some(
      (u) =>
        String(u.phone || "").trim() === phone
    )
  ) {
    return res.status(409).json({
      error: "Цей телефон вже зареєстровано",
    });
  }
  if (
    users.some(
      (u) =>
        String(u.username || "").toLowerCase() ===
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

  res.status(201).json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    username: user.username,
    role: user.role,
    balance: user.balance,
    createdAt: user.createdAt,
  });
});

router.post("/login", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password;

  if (!phone || !password)
    return res.status(400).json({
      error: "Вкажіть телефон і пароль",
    });

  const users = readJSON(USERS_FILE, []);
  const user = users.find(
    (u) => String(u.phone || "").trim() === phone
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

  res.json({
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

// Відновлення паролю — request
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
      (u) =>
        String(u.phone || "").trim() === phone
    );

    // Безпечно: не розкриваємо існування номера
    if (!user) return res.json({ ok: true });

    const resets = readJSON(RESETS_FILE, []);
    const code = generate6DigitCode();
    const { salt, hash } = hashPassword(code);

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

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

    writeJSON(RESETS_FILE, resets);

    console.log(
      `[RESET CODE] phone=${phone} code=${code} (valid 10 min)`
    );
    res.json({ ok: true, code });
  }
);

// Відновлення паролю — confirm
router.post(
  "/password-reset/confirm",
  (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const code = String(
      req.body?.code || ""
    ).trim();
    const newPassword = req.body?.newPassword;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({
        error:
          "Вкажіть телефон, код та новий пароль",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error:
          "Пароль: мін. 8 символів, великі/малі літери, цифра і спецсимвол",
      });
    }

    const users = readJSON(USERS_FILE, []);
    const user = users.find(
      (u) =>
        String(u.phone || "").trim() === phone
    );
    if (!user)
      return res
        .status(400)
        .json({ error: "Невірні дані" });

    let resets = readJSON(RESETS_FILE, []);
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
      return res.status(400).json({
        error:
          "Код прострочений або не запитаний",
      });
    if (reset.attempts >= 5)
      return res.status(400).json({
        error:
          "Забагато спроб. Запитайте новий код",
      });

    const ok = verifyPassword(
      code,
      reset.codeSalt,
      reset.codeHash
    );
    if (!ok) {
      resets = resets.map((r) =>
        r.id === reset.id
          ? { ...r, attempts: r.attempts + 1 }
          : r
      );
      writeJSON(RESETS_FILE, resets);
      return res
        .status(400)
        .json({ error: "Невірний код" });
    }

    const { salt, hash } =
      hashPassword(newPassword);
    const updatedUsers = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            passwordSalt: salt,
            passwordHash: hash,
            passwordUpdatedAt:
              new Date().toISOString(),
          }
        : u
    );
    writeJSON(USERS_FILE, updatedUsers);

    // прибираємо reset-записи цього юзера
    writeJSON(
      RESETS_FILE,
      resets.filter((r) => r.userId !== user.id)
    );

    res.json({ ok: true });
  }
);

export default router;
