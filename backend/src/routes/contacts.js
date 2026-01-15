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
const USERS_FILE = path.join(
  STORAGE_DIR,
  "users.json"
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

/**
 * contacts.json формат:
 * {
 *   "ownerUserId": ["contactUserId1", "contactUserId2"]
 * }
 */

router.get("/", authMiddleware, (req, res) => {
  const users = safeReadJSON(USERS_FILE, []);
  const contactsMap = safeReadJSON(
    CONTACTS_FILE,
    {}
  );

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
 * body: { username: "nick" }  або { userId: "uuid" }
 */
router.post(
  "/add",
  authMiddleware,
  (req, res) => {
    const { username, userId } = req.body || {};
    const users = safeReadJSON(USERS_FILE, []);
    const contactsMap = safeReadJSON(
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
          username.toLowerCase()
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

    contactsMap[req.user.id] =
      contactsMap[req.user.id] || [];
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
