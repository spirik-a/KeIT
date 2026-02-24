import {
  SESSIONS_FILE,
  readJSON,
  writeJSON,
} from "../storage/db.js";

function nowISO() {
  return new Date().toISOString();
}

export default function authMiddleware(
  req,
  res,
  next
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  if (!token)
    return res
      .status(401)
      .json({ error: "No token" });

  const sessions = readJSON(SESSIONS_FILE, []);
  const idx = sessions.findIndex(
    (s) => s.token === token
  );
  if (idx === -1)
    return res
      .status(401)
      .json({ error: "Invalid token" });

  sessions[idx].lastSeen = nowISO();
  writeJSON(SESSIONS_FILE, sessions);

  req.user = { id: sessions[idx].userId };
  next();
}
