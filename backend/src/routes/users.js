import express from "express";
import crypto from "crypto";
import {
  readJSON,
  writeJSON,
} from "../storage/db.js";

const router = express.Router();

/* =========================
   REGISTER
========================= */
router.post("/register", (req, res) => {
  const { phone, name, username } = req.body;

  if (!phone || !name || !username) {
    return res
      .status(400)
      .json({ error: "Missing fields" });
  }

  const users = readJSON("users.json");

  const exists = users.find(
    (u) => u.phone === phone
  );
  if (exists) {
    return res
      .status(409)
      .json({ error: "User already exists" });
  }

  const user = {
    id: crypto.randomUUID(),
    phone,
    name,
    username,
    role: "basic",
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeJSON("users.json", users);

  res.json(user);
});

/* =========================
   LOGIN (SESSION)
========================= */
router.post("/login", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json({ error: "Phone required" });
  }

  const users = readJSON("users.json");
  const user = users.find(
    (u) => u.phone === phone
  );

  if (!user) {
    return res
      .status(404)
      .json({ error: "User not found" });
  }

  const sessions = readJSON("sessions.json");

  const session = {
    token: crypto.randomUUID(),
    userId: user.id,
    createdAt: Date.now(),
  };

  sessions.push(session);
  writeJSON("sessions.json", sessions);

  res.json({ token: session.token, user });
});

/* =========================
   ME (CURRENT USER)
========================= */
router.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res
      .status(401)
      .json({ error: "No token" });
  }

  const token = auth.replace("Bearer ", "");

  const sessions = readJSON("sessions.json");
  const session = sessions.find(
    (s) => s.token === token
  );

  if (!session) {
    return res
      .status(401)
      .json({ error: "Invalid session" });
  }

  const users = readJSON("users.json");
  const user = users.find(
    (u) => u.id === session.userId
  );

  if (!user) {
    return res
      .status(404)
      .json({ error: "User not found" });
  }

  res.json(user);
});

/* =========================
   LOGOUT
========================= */
router.post("/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res
      .status(400)
      .json({ error: "No token" });
  }

  const token = auth.replace("Bearer ", "");

  let sessions = readJSON("sessions.json");
  sessions = sessions.filter(
    (s) => s.token !== token
  );
  writeJSON("sessions.json", sessions);

  res.json({ ok: true });
});

export default router;
