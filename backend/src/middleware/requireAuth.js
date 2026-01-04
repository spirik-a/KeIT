import fs from "fs";
import path from "path";

const sessionsPath = path.resolve(
  "src/storage/sessions.json"
);
const usersPath = path.resolve(
  "src/storage/users.json"
);

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(
    fs.readFileSync(file, "utf-8")
  );
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Не авторизовано" });
  }

  const sessions = readJSON(sessionsPath);
  const session = sessions.find(
    (s) => s.token === token
  );

  if (!session) {
    return res
      .status(401)
      .json({ error: "Сесія недійсна" });
  }

  const users = readJSON(usersPath);
  const user = users.find(
    (u) => u.id === session.userId
  );

  if (!user) {
    return res
      .status(401)
      .json({ error: "Користувача не знайдено" });
  }

  req.user = user; // 🔑 головне
  next();
}
