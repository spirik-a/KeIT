import express from "express";
import { readFileSync, writeFileSync } from "fs";
import { v4 as uuid } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const filePath = path.join(
  __dirname,
  "../storage/messages.json"
);

const readMessages = () =>
  JSON.parse(readFileSync(filePath, "utf-8"));

const writeMessages = (data) =>
  writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );

/**
 * GET /messages/:userId
 * отримати діалог з конкретним користувачем
 */
router.get(
  "/:userId",
  authMiddleware,
  (req, res) => {
    const messages = readMessages();
    const myId = req.user.id;
    const otherId = req.params.userId;

    const dialog = messages.filter(
      (m) =>
        (m.from === myId && m.to === otherId) ||
        (m.from === otherId && m.to === myId)
    );

    res.json(dialog);
  }
);

/**
 * POST /messages
 * відправити повідомлення
 */
router.post("/", authMiddleware, (req, res) => {
  const { to, text } = req.body;

  if (!to || !text) {
    return res
      .status(400)
      .json({ error: "Missing data" });
  }

  const messages = readMessages();

  const message = {
    id: uuid(),
    from: req.user.id,
    to,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  writeMessages(messages);

  res.json(message);
});

export default router;
