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

function writeContacts(data) {
  ensureStorage();
  fs.writeFileSync(
    contactsPath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

router.get("/", requireAuth, (req, res) => {
  const contacts = readContacts().filter(
    (c) => c.ownerId === req.user.id
  );
  res.json(contacts);
});

router.post("/add", requireAuth, (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({
      error: "Не вказано нік користувача",
    });
  }

  const usersPath = path.join(
    storageDir,
    "users.json"
  );
  const users = JSON.parse(
    fs.readFileSync(usersPath, "utf-8")
  );
  const user = users.find(
    (u) => u.username === username
  );

  if (!user) {
    return res
      .status(404)
      .json({ error: "Користувача не знайдено" });
  }

  if (user.id === req.user.id) {
    return res
      .status(400)
      .json({ error: "Не можна додати себе" });
  }

  const contacts = readContacts();
  const exists = contacts.find(
    (c) =>
      c.ownerId === req.user.id &&
      c.contactUserId === user.id
  );

  if (exists) {
    return res
      .status(409)
      .json({ error: "Контакт вже існує" });
  }

  const contact = {
    id: crypto.randomUUID(),
    ownerId: req.user.id,
    contactUserId: user.id,
    contactUsername: user.username,
    createdAt: new Date().toISOString(),
  };

  contacts.push(contact);
  writeContacts(contacts);

  res.status(201).json(contact);
});

export default router;
