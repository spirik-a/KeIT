import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_FILE = path.join(
  __dirname,
  "../storage/messages.json"
);

function readMessages() {
  return JSON.parse(
    fs.readFileSync(MESSAGES_FILE, "utf-8")
  );
}

function writeMessages(data) {
  fs.writeFileSync(
    MESSAGES_FILE,
    JSON.stringify(data, null, 2)
  );
}

// історія переписки з користувачем
router.get("/:withUserId", (req, res) => {
  const userId = req.user.id;
  const withUserId = req.params.withUserId;

  const messages = readMessages().filter(
    (m) =>
      (m.from === userId &&
        m.to === withUserId) ||
      (m.from === withUserId && m.to === userId)
  );

  res.json(messages);
});

// надіслати повідомлення
router.post("/", (req, res) => {
  const { to, text } = req.body;
  const from = req.user.id;

  if (!to || !text) {
    return res
      .status(400)
      .json({ error: "user and text required" });
  }

  const messages = readMessages();

  const message = {
    id: crypto.randomUUID(),
    from,
    to,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  writeMessages(messages);

  res.json(message);
});

export default router;
