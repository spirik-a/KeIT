import express from "express";
import crypto from "crypto";
import authMiddleware from "../middleware/auth.js";
import {
  USERS_FILE,
  CONTACTS_FILE,
  MESSAGES_FILE,
  readJSON,
  writeJSON,
} from "../lib/storage.js";

const router = express.Router();

function nowISO() {
  return new Date().toISOString();
}
function nowMs() {
  return Date.now();
}

function ensureMutualContacts(
  contactsMap,
  aId,
  bId
) {
  if (!contactsMap[aId]) contactsMap[aId] = [];
  if (!contactsMap[aId].includes(bId))
    contactsMap[aId].push(bId);

  if (!contactsMap[bId]) contactsMap[bId] = [];
  if (!contactsMap[bId].includes(aId))
    contactsMap[bId].push(aId);
}

/**
 * GET /messages/inbox
 * Повертає список "діалогів" (peerId + lastMessage)
 */
router.get(
  "/inbox",
  authMiddleware,
  (req, res) => {
    const users = readJSON(USERS_FILE, []);
    const messages = readJSON(MESSAGES_FILE, []);

    const myId = req.user.id;

    // знайти останнє повідомлення з кожним співрозмовником
    const map = new Map(); // peerId -> msg

    for (const m of messages) {
      const isMine =
        m.fromId === myId || m.toId === myId;
      if (!isMine) continue;

      const peerId =
        m.fromId === myId ? m.toId : m.fromId;
      const prev = map.get(peerId);
      if (
        !prev ||
        (m.createdAtMs || 0) >
          (prev.createdAtMs || 0)
      ) {
        map.set(peerId, m);
      }
    }

    const items = Array.from(map.entries())
      .map(([peerId, lastMessage]) => {
        const u = users.find(
          (x) => x.id === peerId
        );
        return {
          peer: u
            ? {
                id: u.id,
                name: u.name,
                username: u.username,
              }
            : {
                id: peerId,
                name: null,
                username: null,
              },
          lastMessage: {
            id: lastMessage.id,
            fromId: lastMessage.fromId,
            toId: lastMessage.toId,
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
          },
        };
      })
      .sort((a, b) => {
        const am = a.lastMessage?.createdAt
          ? Date.parse(a.lastMessage.createdAt)
          : 0;
        const bm = b.lastMessage?.createdAt
          ? Date.parse(b.lastMessage.createdAt)
          : 0;
        return bm - am;
      });

    res.json(items);
  }
);

/**
 * GET /messages/:peerId
 * Повертає історію повідомлень між поточним юзером та peerId
 */
router.get(
  "/:peerId",
  authMiddleware,
  (req, res) => {
    const myId = req.user.id;
    const peerId = String(
      req.params.peerId || ""
    ).trim();

    if (!peerId)
      return res
        .status(400)
        .json({ error: "peerId required" });

    const messages = readJSON(MESSAGES_FILE, []);
    const convo = messages
      .filter(
        (m) =>
          (m.fromId === myId &&
            m.toId === peerId) ||
          (m.fromId === peerId && m.toId === myId)
      )
      .sort(
        (a, b) =>
          (a.createdAtMs || 0) -
          (b.createdAtMs || 0)
      );

    res.json(convo);
  }
);

/**
 * POST /messages
 * body: { to: "<userId>", text: "..." }
 *
 * ВАЖЛИВО: при першому повідомленні автоматично створює взаємні контакти,
 * щоб у другому браузері контакт з’явився без ручного додавання.
 */
router.post("/", authMiddleware, (req, res) => {
  const myId = req.user.id;
  const to = String(req.body?.to || "").trim();
  const text = String(
    req.body?.text || ""
  ).trim();

  if (!to || !text)
    return res
      .status(400)
      .json({ error: "to and text required" });
  if (to === myId)
    return res
      .status(400)
      .json({ error: "cannot message yourself" });

  const users = readJSON(USERS_FILE, []);
  const receiver = users.find((u) => u.id === to);
  if (!receiver)
    return res
      .status(404)
      .json({ error: "recipient not found" });

  const messages = readJSON(MESSAGES_FILE, []);
  const msg = {
    id: crypto.randomUUID(),
    fromId: myId,
    toId: to,
    text,
    createdAt: nowISO(),
    createdAtMs: nowMs(),
  };
  messages.push(msg);
  writeJSON(MESSAGES_FILE, messages);

  // авто-додавання в контакти (взаємно)
  const contactsMap = readJSON(CONTACTS_FILE, {});
  ensureMutualContacts(contactsMap, myId, to);
  writeJSON(CONTACTS_FILE, contactsMap);

  res.json({ ok: true, message: msg });
});

export default router;
