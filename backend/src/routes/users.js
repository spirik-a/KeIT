import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";

import authMiddleware from "../middleware/auth.js";
import {
  USERS_FILE,
  SESSIONS_FILE,
  readJSON,
  writeJSON,
} from "../storage/db.js";

const router = express.Router();

/* =========================
   Helpers
========================= */
function nowISO() {
  return new Date().toISOString();
}

function hashPasswordSha256(password) {
  return crypto
    .createHash("sha256")
    .update(password, "utf8")
    .digest("hex");
}

// сумісність: якщо колись буде інший формат, поки що підтримуємо sha256 hex
function verifyPassword(password, storedHash) {
  const h = hashPasswordSha256(password);
  return h === storedHash;
}

function validatePassword(password) {
  // 8+ символів, мала, велика, цифра, символ
  if (typeof password !== "string")
    return "Пароль має бути рядком";
  if (password.length < 8)
    return "Пароль має бути не менше 8 символів";
  if (!/[a-z]/.test(password))
    return "Пароль має містити малу літеру";
  if (!/[A-Z]/.test(password))
    return "Пароль має містити велику літеру";
  if (!/[0-9]/.test(password))
    return "Пароль має містити цифру";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Пароль має містити символ";
  return null;
}

function publicUser(u) {
  return {
    id: u.id,
    phone: u.phone,
    username: u.username,
    name: u.name,
    role: u.role,
    balance: u.balance,
    status: u.status || "",
    avatarUrl: u.avatarUrl || null,
  };
}

/* =========================
   Upload setup (avatar)
========================= */
const uploadDir = path.resolve(
  "..",
  "frontend",
  "uploads"
);
// (ти запускаєш npm start у backend, тому ".." — це корінь KeIT)
if (!fs.existsSync(uploadDir))
  fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext =
      path
        .extname(file.originalname || "")
        .toLowerCase() || ".png";
    cb(null, `${req.user.id}${ext}`);
  },
});

const upload = multer({ storage });

/* =========================
   Routes
========================= */

/**
 * POST /users/register
 * body: { phone, name, username, password }
 */
router.post("/register", (req, res) => {
  const phone = String(
    req.body?.phone || ""
  ).trim();
  const name = String(
    req.body?.name || ""
  ).trim();
  const username = String(
    req.body?.username || ""
  ).trim();
  const password = String(
    req.body?.password || ""
  );

  if (!phone || !name || !username || !password) {
    return res
      .status(400)
      .json({
        error:
          "phone, name, username, password required",
      });
  }

  const pwdErr = validatePassword(password);
  if (pwdErr)
    return res
      .status(400)
      .json({ error: pwdErr });

  const users = readJSON(USERS_FILE, []);

  const phoneTaken = users.find(
    (u) => String(u.phone || "").trim() === phone
  );
  if (phoneTaken)
    return res
      .status(409)
      .json({ error: "User already exists" });

  const usernameTaken = users.find(
    (u) =>
      (u.username || "").toLowerCase() ===
      username.toLowerCase()
  );
  if (usernameTaken)
    return res
      .status(409)
      .json({ error: "Username already taken" });

  const user = {
    id: crypto.randomUUID(),
    phone,
    name,
    username,
    passwordHash: hashPasswordSha256(password), // ВАЖЛИВО: зберігаємо хеш
    role: "basic",
    balance: 0,
    status: "",
    avatarUrl: null,
    createdAt: nowISO(),
  };

  users.push(user);
  writeJSON(USERS_FILE, users);

  return res.json({
    ok: true,
    user: publicUser(user),
  });
});

/**
 * POST /users/login
 * body: { phone, password }
 * returns { token, user }
 */
router.post("/login", (req, res) => {
  const phone = String(
    req.body?.phone || ""
  ).trim();
  const password = String(
    req.body?.password || ""
  );

  if (!phone || !password) {
    return res
      .status(400)
      .json({
        error: "phone and password required",
      });
  }

  const users = readJSON(USERS_FILE, []);
  const user = users.find(
    (u) => String(u.phone || "").trim() === phone
  );

  if (!user)
    return res
      .status(404)
      .json({ error: "User not found" });

  // сумісність: якщо раптом старі записи мали інше поле
  const stored =
    user.passwordHash || user.password || "";
  if (!verifyPassword(password, stored)) {
    return res
      .status(401)
      .json({ error: "Wrong password" });
  }

  const token = crypto.randomUUID();

  const sessions = readJSON(SESSIONS_FILE, []);
  sessions.push({
    token,
    userId: user.id,
    username: user.username,
    phone: user.phone,
    createdAt: nowISO(),
  });
  writeJSON(SESSIONS_FILE, sessions);

  return res.json({
    token,
    user: publicUser(user),
  });
});

/**
 * GET /users/me
 */
router.get("/me", authMiddleware, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const me = users.find(
    (u) => u.id === req.user.id
  );
  if (!me)
    return res
      .status(404)
      .json({ error: "User not found" });
  res.json(publicUser(me));
});

/**
 * POST /users/profile
 * body: { name, username, status }
 */
router.post(
  "/profile",
  authMiddleware,
  (req, res) => {
    const name = (req.body?.name ?? "")
      .toString()
      .trim();
    const username = (req.body?.username ?? "")
      .toString()
      .trim();
    const status = (
      req.body?.status ?? ""
    ).toString();

    const users = readJSON(USERS_FILE, []);
    const me = users.find(
      (u) => u.id === req.user.id
    );
    if (!me)
      return res
        .status(404)
        .json({ error: "User not found" });

    if (username) {
      const taken = users.find(
        (u) =>
          (u.username || "").toLowerCase() ===
            username.toLowerCase() &&
          u.id !== me.id
      );
      if (taken)
        return res
          .status(409)
          .json({
            error: "Username already taken",
          });
    }

    if (name) me.name = name;
    if (username) me.username = username;
    me.status = status;

    writeJSON(USERS_FILE, users);
    res.json(publicUser(me));
  }
);

/**
 * POST /users/avatar
 * multipart/form-data, field name: avatar
 */
router.post(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  (req, res) => {
    if (!req.file)
      return res
        .status(400)
        .json({ error: "No file" });

    const users = readJSON(USERS_FILE, []);
    const me = users.find(
      (u) => u.id === req.user.id
    );
    if (!me)
      return res
        .status(404)
        .json({ error: "User not found" });

    me.avatarUrl = `/frontend/uploads/${req.file.filename}`;
    writeJSON(USERS_FILE, users);

    res.json({
      ok: true,
      avatarUrl: me.avatarUrl,
    });
  }
);

export default router;
