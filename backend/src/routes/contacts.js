import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTACTS_FILE = path.join(
  __dirname,
  "../storage/contacts.json"
);

function readContacts() {
  return JSON.parse(
    fs.readFileSync(CONTACTS_FILE, "utf-8")
  );
}

function writeContacts(data) {
  fs.writeFileSync(
    CONTACTS_FILE,
    JSON.stringify(data, null, 2)
  );
}

// отримати контакти користувача
router.get("/", (req, res) => {
  const userId = req.user.id;
  const contacts = readContacts().filter(
    (c) => c.ownerId === userId
  );
  res.json(contacts);
});

// додати контакт
router.post("/", (req, res) => {
  const { contactUserId, name } = req.body;
  const userId = req.user.id;

  if (!contactUserId || !name) {
    return res
      .status(400)
      .json({ error: "Missing data" });
  }

  const contacts = readContacts();

  const exists = contacts.find(
    (c) =>
      c.ownerId === userId &&
      c.contactUserId === contactUserId
  );
  if (exists) {
    return res
      .status(409)
      .json({ error: "Contact already exists" });
  }

  const newContact = {
    id: crypto.randomUUID(),
    ownerId: userId,
    contactUserId,
    name,
  };

  contacts.push(newContact);
  writeContacts(contacts);

  res.json(newContact);
});

export default router;
