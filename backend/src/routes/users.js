import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = express.Router();

// Використовуємо storage (як у твоєму persist раніше)
const storageDir = path.resolve("src/storage");
const usersPath = path.join(
  storageDir,
  "users.json"
);
const sessionsPath = path.join(
  storageDir,
  "sessions.json"
);

/* ===== ensure storage exists ===== */
function ensureStorage() {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, "[]", "utf-8");
  }
  if (!fs.existsSync(sessionsPath)) {
    fs.writeFileSync(sessionsPath, "[]", "utf-8");
  }
}

function readJSON(file) {
  ensureStorage();
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw);
}

function writeJSON(file, data) {
  ensureStorage();
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

function nowHuman() {
  // "YYYY-MM-DD HH:MM:SS"
  return new Date()
    .toISOString()
    .replace("T", " ")
    .substring(0, 19);
}

/* ===== REGISTER ===== */
router.post("/register", (req, res) => {
  const { phone, name, username, password } =
    req.body;

  if (!phone || !name || !username || !password) {
    return res
      .status(400)
      .json({ error: "Не всі поля заповнені" });
  }

  const users = readJSON(usersPath);

  const exists = users.find(
    (u) =>
      u.phone === phone || u.username === username
  );

  if (exists) {
    return res
      .status(409)
      .json({ error: "Користувач вже існує" });
  }

  const user = {
    id: crypto.randomUUID(),
    phone,
    name,
    username,
    password, // зберігаємо (наступним кроком замінимо на hash)
    role: "basic",
    balance: 0,
    createdAt: nowHuman(),
  };

  users.push(user);
  writeJSON(usersPath, users);

  // пароль не повертаємо на фронт
  return res.status(201).json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    username: user.username,
    role: user.role,
    balance: user.balance,
  });
});

/* ===== LOGIN ===== */
router.post("/login", (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({
      error: "Введи номер телефону та пароль",
    });
  }

  const users = readJSON(usersPath);
  const user = users.find(
    (u) =>
      u.phone === phone && u.password === password
  );

  if (!user) {
    return res.status(404).json({
      error: "Невірний телефон або пароль",
    });
  }

  const token = crypto.randomUUID();

  const sessions = readJSON(sessionsPath);
  sessions.push({
    token,
    userId: user.id,
    username: user.username,
    createdAt: nowHuman(),
    createdAtISO: new Date().toISOString(),
  });

  writeJSON(sessionsPath, sessions);

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

/* ===== ME ===== */
router.get("/me", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Відсутній токен" });
  }

  const sessions = readJSON(sessionsPath);
  const session = sessions.find(
    (s) => s.token === token
  );

  if (!session) {
    return res
      .status(401)
      .json({ error: "Недійсна сесія" });
  }

  const users = readJSON(usersPath);
  const user = users.find(
    (u) => u.id === session.userId
  );

  if (!user) {
    return res
      .status(404)
      .json({ error: "Користувача не знайдено" });
  }

  return res.json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    username: user.username,
    role: user.role,
    balance: user.balance,
  });
});

/* ===== LOGOUT ===== */
router.post("/logout", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;

  if (!token) {
    return res
      .status(400)
      .json({ error: "Відсутній токен" });
  }

  let sessions = readJSON(sessionsPath);
  sessions = sessions.filter(
    (s) => s.token !== token
  );
  writeJSON(sessionsPath, sessions);

  return res.json({ ok: true });
});

export default router;
