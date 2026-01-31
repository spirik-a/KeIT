import {
  SESSIONS_FILE,
  readJSON,
} from "../storage/db.js";

export default function authMiddleware(
  req,
  res,
  next
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : null;

  if (!token)
    return res
      .status(401)
      .json({ error: "No token" });

  const sessions = readJSON(SESSIONS_FILE, []);
  const s = sessions.find(
    (x) => x.token === token
  );

  if (!s)
    return res
      .status(401)
      .json({ error: "Invalid token" });

  req.user = { id: s.userId };
  next();
}
