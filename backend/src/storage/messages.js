import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

const storageDir = path.resolve("src/storage");
const messagesPath = path.join(
  storageDir,
  "messages.json"
);

function ensureStorage() {
  if (!fs.existsSync(storageDir))
    fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(messagesPath))
    fs.writeFileSync(messagesPath, "[]", "utf-8");
}

function readMessages() {
  ensureStorage();
  return JSON.parse(
    fs.readFileSync(messagesPath, "utf-8")
  );
}

function writeMessages(messages) {
  ensureStorage();
  fs.writeFileSync(
    messagesPath,
    JSON.stringify(messages, null, 2),
    "utf-8"
  );
}

/* GET /messages/dialog/:userId - отримати діалог */
router.get(
  "/dialog/:userId",
  requireAuth,
  (req, res) => {
    const otherUserId = req.params.userId;
    const me = req.user.id;

    const messages = readMessages().filter(
      (m) =>
        (m.from === me && m.to === otherUserId) ||
        (m.from === otherUserId && m.to === me)
    );

    res.json(messages);
  }
);

/* POST /messages/send - надіслати повідомлення */
router.post("/send", requireAuth, (req, res) => {
  const { to, text } = req.body;
  const from = req.user.id;

  if (!to || !text || !String(text).trim()) {
    return res
      .status(400)
      .json({ error: "Порожнє повідомлення" });
  }

  const messages = readMessages();

  const msg = {
    id: crypto.randomUUID(),
    from,
    to,
    text: String(text).trim(),
    createdAt: new Date().toISOString(),
  };

  messages.push(msg);
  writeMessages(messages);

  res.status(201).json(msg);
});

export default router;
