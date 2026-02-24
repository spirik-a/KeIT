import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  USERS_FILE,
  CONTACTS_FILE,
  SESSIONS_FILE,
  readJSON,
  writeJSON,
} from "../storage/db.js";

const router = express.Router();
const ONLINE_SECONDS = 45;

function isOnline(userId) {
  const sessions = readJSON(SESSIONS_FILE, []);
  const now = Date.now();
  return sessions.some((s) => {
    if (s.userId !== userId) return false;
    const last = Date.parse(
      s.lastSeen || s.createdAt || ""
    );
    if (!Number.isFinite(last)) return false;
    return now - last <= ONLINE_SECONDS * 1000;
  });
}

function userPublic(u) {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl || null,
    statusKey: u.statusKey || "ready",
    isOnline: isOnline(u.id),
  };
}

router.get("/", authMiddleware, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const contactsMap = readJSON(CONTACTS_FILE, {});
  const ids = contactsMap[req.user.id] || [];

  const list = ids
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean)
    .map(userPublic);
  res.json(list);
});

router.post(
  "/add",
  authMiddleware,
  (req, res) => {
    const users = readJSON(USERS_FILE, []);
    const contactsMap = readJSON(
      CONTACTS_FILE,
      {}
    );

    const phone = String(
      req.body?.phone || ""
    ).trim();
    const username = String(
      req.body?.username || ""
    ).trim();

    if (!phone && !username)
      return res.status(400).json({
        error: "phone or username required",
      });

    let contact = null;
    if (phone)
      contact = users.find(
        (u) =>
          String(u.phone || "").trim() === phone
      );
    else
      contact = users.find(
        (u) =>
          (u.username || "").toLowerCase() ===
          username.toLowerCase()
      );

    if (!contact)
      return res
        .status(404)
        .json({ error: "Контакт не знайдено" });
    if (contact.id === req.user.id)
      return res
        .status(400)
        .json({ error: "Не можна додати себе" });

    contactsMap[req.user.id] ??= [];
    contactsMap[contact.id] ??= [];

    if (
      !contactsMap[req.user.id].includes(
        contact.id
      )
    )
      contactsMap[req.user.id].push(contact.id);
    if (
      !contactsMap[contact.id].includes(
        req.user.id
      )
    )
      contactsMap[contact.id].push(req.user.id);

    writeJSON(CONTACTS_FILE, contactsMap);
    res.json({
      ok: true,
      contact: userPublic(contact),
    });
  }
);

export default router;
