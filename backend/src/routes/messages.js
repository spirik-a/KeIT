import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(
  __dirname,
  "..",
  "storage"
);
const MESSAGES_FILE = path.join(
  STORAGE_DIR,
  "messages.json"
);
const CONTACTS_FILE = path.join(
  STORAGE_DIR,
  "contacts.json"
);

function safeReadJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf-8")
    );
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

function ensureContactsBothWays(fromId, toId) {
  const contactsMap = safeReadJSON(
    CONTACTS_FILE,
    {}
  );
  contactsMap[fromId] = contactsMap[fromId] || [];
  contactsMap[toId] = contactsMap[toId] || [];

  if (!contactsMap[fromId].includes(toId))
    contactsMap[fromId].push(toId);
  if (!contactsMap[toId].includes(fromId))
    contactsMap[toId].push(fromId);

  writeJSON(CONTACTS_FILE, contactsMap);
}

router.get(
  "/:userId",
  authMiddleware,
  (req, res) => {
    const myId = req.user.id;
    const otherId = req.params.userId;

    const all = safeReadJSON(MESSAGES_FILE, []);
    const dialog = all.filter(
      (m) =>
        (m.from === myId && m.to === otherId) ||
        (m.from === otherId && m.to === myId)
    );

    res.json(dialog);
  }
);

router.post("/", authMiddleware, (req, res) => {
  const { to, text } = req.body || {};
  if (!to || !text)
    return res
      .status(400)
      .json({ error: "to and text required" });

  const myId = req.user.id;

  const all = safeReadJSON(MESSAGES_FILE, []);

  const msg = {
    id: crypto.randomUUID(),
    from: myId,
    to,
    text,
    createdAt: new Date().toISOString(),
  };

  all.push(msg);
  writeJSON(MESSAGES_FILE, all);

  // авто-контакти
  ensureContactsBothWays(myId, to);

  res.json(msg);
});

export default router;
