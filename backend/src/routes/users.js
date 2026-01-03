import express from "express";
import { randomUUID } from "crypto";

const router = express.Router();

// Временное хранилище (до persist)
const users = [];
const sessions = new Map(); // token -> userId

// POST /users/register
router.post("/register", (req, res) => {
  const { phone, name, username } = req.body;

  if (!phone || !name || !username) {
    return res
      .status(400)
      .json({ error: "Missing required fields" });
  }

  const existingUser = users.find(
    (u) => u.phone === phone
  );
  if (existingUser) {
    return res
      .status(409)
      .json({ error: "User already exists" });
  }

  const newUser = {
    id: randomUUID(),
    phone,
    name,
    username,
    role: "basic",
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  return res.status(201).json(newUser);
});

// POST /users/login
router.post("/login", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json({ error: "Phone is required" });
  }

  const user = users.find(
    (u) => u.phone === phone
  );
  if (!user) {
    return res
      .status(404)
      .json({ error: "User not found" });
  }

  const token = randomUUID();
  sessions.set(token, user.id);

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

// GET /users/me  (требует токен)
router.get("/me", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Missing Bearer token" });
  }

  const userId = sessions.get(token);
  if (!userId) {
    return res
      .status(401)
      .json({ error: "Invalid token" });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({
      error: "User not found for token",
    });
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

// POST /users/logout
router.post("/logout", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Missing Bearer token" });
  }

  sessions.delete(token);
  return res.json({ ok: true });
});

export default router;
