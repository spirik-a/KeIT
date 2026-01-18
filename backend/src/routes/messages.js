import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messagesPath = path.join(
  __dirname,
  "../data/messages.json"
);

function read() {
  return JSON.parse(
    fs.readFileSync(messagesPath, "utf-8")
  );
}

function write(data) {
  fs.writeFileSync(
    messagesPath,
    JSON.stringify(data, null, 2)
  );
}

/* GET CHAT */
router.get("/:userId", (req, res) => {
  const me =
    req.headers.authorization?.split(" ")[1];
  const other = req.params.userId;

  const messages = read().filter(
    (m) =>
      (m.from === me && m.to === other) ||
      (m.from === other && m.to === me)
  );

  res.json(messages);
});

/* SEND */
router.post("/", (req, res) => {
  const { from, to, text } = req.body;
  if (!from || !to || !text)
    return res
      .status(400)
      .json({ error: "invalid message" });

  const messages = read();
  messages.push({
    id: Date.now(),
    from,
    to,
    text,
    time: new Date().toISOString(),
  });

  write(messages);
  res.json({ ok: true });
});

export default router;
