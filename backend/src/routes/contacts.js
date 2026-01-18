import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveStorageDir() {
  const a = path.join(__dirname, "..", "storage");
  const b = path.join(
    __dirname,
    "..",
    "storadge"
  );
  if (fs.existsSync(a)) return a;
  if (fs.existsSync(b)) return b;
  fs.mkdirSync(a, { recursive: true });
  return a;
}

const STORAGE_DIR = resolveStorageDir();
const USERS_FILE = path.join(
  STORAGE_DIR,
  "users.json"
);
const CONTACTS_FILE = path.join(
  STORAGE_DIR,
  "contacts.json"
);

function ensureFiles() {
  if (!fs.existsSync(STORAGE_DIR))
    fs.mkdirSync(STORAGE_DIR, {
      recursive: true,
    });
  if (!fs.existsSync(USERS_FILE))
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  if (!fs.existsSync(CONTACTS_FILE))
    fs.writeFileSync(
      CONTACTS_FILE,
      "{}",
      "utf-8"
    );
}

function readJSON(file, fallback) {
  ensureFiles();
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf-8")
    );
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  ensureFiles();
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

/**
 * GET /contacts
 */
router.get("/", authMiddleware, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const contactsMap = readJSON(CONTACTS_FILE, {});

  const ids = contactsMap[req.user.id] || [];
  const list = ids
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      phone: u.phone,
      role: u.role,
    }));

  res.json(list);
});

/**
 * POST /contacts/add
 * body: { username } або { userId }
 */
router.post(
  "/add",
  authMiddleware,
  (req, res) => {
    const { username, userId } = req.body || {};

    const users = readJSON(USERS_FILE, []);
    const contactsMap = readJSON(
      CONTACTS_FILE,
      {}
    );

    let contact = null;

    if (userId) {
      contact = users.find(
        (u) => u.id === userId
      );
    } else if (username) {
      contact = users.find(
        (u) =>
          (u.username || "").toLowerCase() ===
          String(username).toLowerCase()
      );
    }

    if (!contact)
      return res
        .status(404)
        .json({ error: "Contact not found" });
    if (contact.id === req.user.id)
      return res
        .status(400)
        .json({ error: "Cannot add yourself" });

    if (!contactsMap[req.user.id])
      contactsMap[req.user.id] = [];
    if (
      !contactsMap[req.user.id].includes(
        contact.id
      )
    ) {
      contactsMap[req.user.id].push(contact.id);
    }

    writeJSON(CONTACTS_FILE, contactsMap);

    res.json({
      ok: true,
      contact: {
        id: contact.id,
        name: contact.name,
        username: contact.username,
        phone: contact.phone,
        role: contact.role,
      },
    });
  }
);

export default router;
