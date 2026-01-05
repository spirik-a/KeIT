import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

const storageDir = path.resolve("src/storage");
const contactsPath = path.join(
  storageDir,
  "contacts.json"
);

function ensureStorage() {
  if (!fs.existsSync(storageDir))
    fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(contactsPath))
    fs.writeFileSync(contactsPath, "[]", "utf-8");
}

function readContacts() {
  ensureStorage();
  return JSON.parse(
    fs.readFileSync(contactsPath, "utf-8")
  );
}

function writeContacts(contacts) {
  ensureStorage();
  fs.writeFileSync(
    contactsPath,
    JSON.stringify(contacts, null, 2),
    "utf-8"
  );
}

/* GET /contacts - список контактів поточного користувача */
router.get("/", requireAuth, (req, res) => {
  const contacts = readContacts().filter(
    (c) => c.ownerId === req.user.id
  );
  res.json(contacts);
});

/* POST /contacts/add - додати контакт по username */
router.post("/add", requireAuth, (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      error: "Потрібен нікнейм контакту",
    });
  }

  // Беремо users.json, щоб знайти користувача по username
  const usersPath = path.join(
    storageDir,
    "users.json"
  );
  if (!fs.existsSync(usersPath)) {
    return res.status(500).json({
      error: "Файл users.json не знайдено",
    });
  }

  const users = JSON.parse(
    fs.readFileSync(usersPath, "utf-8")
  );
  const contactUser = users.find(
    (u) => u.username === username
  );

  if (!contactUser) {
    return res.status(404).json({
      error:
        "Користувача з таким ніком не знайдено",
    });
  }

  if (contactUser.id === req.user.id) {
    return res.status(400).json({
      error: "Не можна додати себе в контакти",
    });
  }

  const contacts = readContacts();

  const exists = contacts.find(
    (c) =>
      c.ownerId === req.user.id &&
      c.contactUserId === contactUser.id
  );

  if (exists) {
    return res
      .status(409)
      .json({ error: "Контакт вже існує" });
  }

  const newContact = {
    id: crypto.randomUUID(),
    ownerId: req.user.id,
    contactUserId: contactUser.id,
    contactUsername: contactUser.username,
    contactName: contactUser.name || "",
    createdAt: new Date().toISOString(),
  };

  contacts.push(newContact);
  writeContacts(contacts);

  res.status(201).json(newContact);
});

export default router;
