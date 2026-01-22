import express from "express";
import crypto from "crypto";
import {
  STORAGE_DIR,
  USERS_FILE,
  readJSON,
  writeJSON,
} from "../lib/storage.js";

const router = express.Router();

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

  if (!adminKey) {
    return res.status(500).json({
      error: "ADMIN_KEY is not set on server",
      hint: "Start server with: $env:ADMIN_KEY='your_key'; npm start",
    });
  }

  if (
    !provided ||
    String(provided) !== String(adminKey)
  ) {
    return res.status(403).json({
      error: "Forbidden",
      hint: "Wrong X-Admin-Key header",
    });
  }

  next();
}

router.get("/ping", requireAdmin, (req, res) => {
  res.json({ ok: true, storageDir: STORAGE_DIR });
});

router.get("/users", requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE, []).map(
    (u) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      username: u.username,
      role: u.role,
      balance: u.balance,
      createdAt: u.createdAt,
      passwordUpdatedAt:
        u.passwordUpdatedAt || null,
    })
  );

  res.json({
    ok: true,
    storageDir: STORAGE_DIR,
    count: users.length,
    users,
  });
});

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
    const userId = String(
      req.body?.userId || ""
    ).trim();
    const newPassword = req.body?.newPassword;

    if (
      (!phone && !username && !userId) ||
      !newPassword
    ) {
      return res.status(400).json({
        error:
          "Provide phone or username or userId and newPassword",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error:
          "Password does not meet requirements",
      });
    }

    const users = readJSON(USERS_FILE, []);

    const idx = users.findIndex((u) => {
      if (userId)
        return String(u.id || "") === userId;
      if (phone)
        return (
          String(u.phone || "").trim() === phone
        );
      return (
        String(u.username || "").toLowerCase() ===
        username.toLowerCase()
      );
    });

    if (idx === -1) {
      return res.status(404).json({
        error: "User not found",
        hint: "Use GET /admin/users to see exact userId/phone/username",
      });
    }

    const { salt, hash } =
      hashPassword(newPassword);
    users[idx].passwordSalt = salt;
    users[idx].passwordHash = hash;
    users[idx].passwordUpdatedAt =
      new Date().toISOString();

    writeJSON(USERS_FILE, users);

    res.json({
      ok: true,
      storageDir: STORAGE_DIR,
      user: {
        id: users[idx].id,
        phone: users[idx].phone,
        username: users[idx].username,
      },
    });
  }
);

export default router;
