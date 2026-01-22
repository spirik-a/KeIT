import {
  USERS_FILE,
  SESSIONS_FILE,
  readJSON,
} from "../lib/storage.js";

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
      .json({ error: "Unauthorized" });

  const sessions = readJSON(SESSIONS_FILE, []);
  const session = sessions.find(
    (s) => s.token === token
  );
  if (!session)
    return res
      .status(401)
      .json({ error: "Invalid session" });

  const users = readJSON(USERS_FILE, []);
  const user = users.find(
    (u) => u.id === session.userId
  );
  if (!user)
    return res
      .status(401)
      .json({ error: "User not found" });

  req.user = user;
  next();
}
