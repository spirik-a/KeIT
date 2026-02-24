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

const STATUS = {
  ready: {
    label: "Готовий до розмови",
    color: "blue",
  },
  busy: { label: "Зайнятий", color: "yellow" },
  angry: {
    label: "Без настрою / сердитий",
    color: "red",
  },
};

function nowISO() {
  return new Date().toISOString();
}

function hashPasswordSha256(password) {
  return crypto
    .createHash("sha256")
    .update(password, "utf8")
    .digest("hex");
}

function verifyPassword(password, storedHash) {
  return (
    hashPasswordSha256(password) === storedHash
  );
}

function validatePassword(password) {
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
    statusKey: u.statusKey || "ready",
    avatarUrl: u.avatarUrl || null,
  };
}

/* ===== Upload avatar -> KeIT/frontend/uploads ===== */
const uploadDir = path.resolve(
  "..",
  "frontend",
  "uploads"
);
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

/* ===== Routes ===== */

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
    return res.status(400).json({
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

  if (
    users.find(
      (u) =>
        String(u.phone || "").trim() === phone
    )
  ) {
    return res
      .status(409)
      .json({ error: "User already exists" });
  }
  if (
    users.find(
      (u) =>
        (u.username || "").toLowerCase() ===
        username.toLowerCase()
    )
  ) {
    return res
      .status(409)
      .json({ error: "Username already taken" });
  }

  const user = {
    id: crypto.randomUUID(),
    phone,
    name,
    username,
    passwordHash: hashPasswordSha256(password),
    role: "basic",
    balance: 0,
    statusKey: "ready",
    avatarUrl: null,
    createdAt: nowISO(),
  };

  users.push(user);
  writeJSON(USERS_FILE, users);

  res.json({ ok: true, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const phone = String(
    req.body?.phone || ""
  ).trim();
  const password = String(
    req.body?.password || ""
  );

  if (!phone || !password)
    return res.status(400).json({
      error: "phone and password required",
    });

  const users = readJSON(USERS_FILE, []);
  const user = users.find(
    (u) => String(u.phone || "").trim() === phone
  );
  if (!user)
    return res
      .status(404)
      .json({ error: "User not found" });

  if (
    !verifyPassword(
      password,
      user.passwordHash || ""
    )
  ) {
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
    lastSeen: nowISO(),
  });
  writeJSON(SESSIONS_FILE, sessions);

  res.json({ token, user: publicUser(user) });
});

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

router.post(
  "/profile",
  authMiddleware,
  (req, res) => {
    const name = String(
      req.body?.name ?? ""
    ).trim();
    const username = String(
      req.body?.username ?? ""
    ).trim();
    const statusKey = String(
      req.body?.statusKey ?? ""
    ).trim();

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
        return res.status(409).json({
          error: "Username already taken",
        });
    }

    if (statusKey) {
      if (!STATUS[statusKey])
        return res
          .status(400)
          .json({ error: "Invalid statusKey" });
      me.statusKey = statusKey;
    }

    if (name) me.name = name;
    if (username) me.username = username;

    writeJSON(USERS_FILE, users);
    res.json(publicUser(me));
  }
);

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

router.post(
  "/ping",
  authMiddleware,
  (req, res) => {
    res.json({ ok: true });
  }
);

export default router;
