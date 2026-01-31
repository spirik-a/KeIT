import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  USERS_FILE,
  MESSAGES_FILE,
  readJSON,
  writeJSON,
} from "../storage/db.js";

const router = express.Router();

function userPublic(u) {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl || null,
    status: u.status || "",
  };
}

function msgId() {
  return (
    "m_" +
    Math.random().toString(16).slice(2) +
    Date.now().toString(16)
  );
}

/**
 * POST /messages
 * body: { to: "<userId>", text: "..." }
 */
router.post("/", authMiddleware, (req, res) => {
  const to = String(req.body?.to || "").trim();
  const text = String(
    req.body?.text || ""
  ).trim();

  if (!to || !text)
    return res
      .status(400)
      .json({ error: "to and text required" });

  const users = readJSON(USERS_FILE, []);
  const toUser = users.find((u) => u.id === to);
  if (!toUser)
    return res
      .status(404)
      .json({ error: "Recipient not found" });

  const messages = readJSON(MESSAGES_FILE, []);

  const msg = {
    id: msgId(),
    fromId: req.user.id,
    toId: to,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(msg);
  writeJSON(MESSAGES_FILE, messages);

  res.json(msg);
});

/**
 * GET /messages/inbox
 * Повертає список діалогів з останнім повідомленням
 */
router.get(
  "/inbox",
  authMiddleware,
  (req, res) => {
    const users = readJSON(USERS_FILE, []);
    const messages = readJSON(MESSAGES_FILE, []);

    const mine = messages.filter(
      (m) =>
        m.fromId === req.user.id ||
        m.toId === req.user.id
    );

    const byPeer = new Map(); // peerId -> lastMessage
    for (const m of mine) {
      const peerId =
        m.fromId === req.user.id
          ? m.toId
          : m.fromId;
      const prev = byPeer.get(peerId);
      if (
        !prev ||
        new Date(m.createdAt) >
          new Date(prev.createdAt)
      ) {
        byPeer.set(peerId, m);
      }
    }

    const result = Array.from(
      byPeer.entries()
    ).map(([peerId, lastMessage]) => {
      const u = users.find(
        (x) => x.id === peerId
      );
      return {
        peer: u ? userPublic(u) : { id: peerId },
        lastMessage,
      };
    });

    result.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) -
        new Date(a.lastMessage.createdAt)
    );
    res.json(result);
  }
);

/**
 * GET /messages/:peerId
 * Історія між мною та peerId
 */
router.get(
  "/:peerId",
  authMiddleware,
  (req, res) => {
    const peerId = String(
      req.params.peerId || ""
    ).trim();
    const messages = readJSON(MESSAGES_FILE, []);

    const convo = messages.filter(
      (m) =>
        (m.fromId === req.user.id &&
          m.toId === peerId) ||
        (m.fromId === peerId &&
          m.toId === req.user.id)
    );

    res.json(convo);
  }
);

export default router;
