import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contactsPath = path.join(
  __dirname,
  "../data/contacts.json"
);
const usersPath = path.join(
  __dirname,
  "../data/users.json"
);

function read(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf-8")
  );
}

function write(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

/* GET CONTACTS */
router.get("/", (req, res) => {
  const userId =
    req.headers.authorization?.split(" ")[1];
  if (!userId) return res.json([]);

  let contacts = read(contactsPath);
  const users = read(usersPath);

  let myContacts = contacts.filter(
    (c) => c.ownerId === userId
  );

  /* AUTO CREATE CONTACTS */
  if (myContacts.length === 0) {
    users
      .filter((u) => u.id !== userId)
      .forEach((u) => {
        contacts.push({
          ownerId: userId,
          contactUserId: u.id,
          name: u.name,
        });
      });

    write(contactsPath, contacts);
    myContacts = contacts.filter(
      (c) => c.ownerId === userId
    );
  }

  res.json(myContacts);
});

export default router;
