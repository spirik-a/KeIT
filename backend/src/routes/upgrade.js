import express from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
const usersPath = path.resolve(
  "src/storage/users.json"
);

const UPGRADE_PRICE = 50;

function readUsers() {
  if (!fs.existsSync(usersPath)) return [];
  return JSON.parse(
    fs.readFileSync(usersPath, "utf-8")
  );
}

function writeUsers(users) {
  fs.writeFileSync(
    usersPath,
    JSON.stringify(users, null, 2),
    "utf-8"
  );
}

/* ===== UPGRADE ROLE ===== */
router.post("/", requireAuth, (req, res) => {
  const users = readUsers();
  const user = users.find(
    (u) => u.id === req.user.id
  );

  if (!user) {
    return res
      .status(404)
      .json({ error: "Користувача не знайдено" });
  }

  if (user.role === "improved") {
    return res
      .status(400)
      .json({ error: "Роль вже активна" });
  }

  if (user.balance < UPGRADE_PRICE) {
    return res.status(400).json({
      error: "Недостатньо коштів",
      required: UPGRADE_PRICE,
      balance: user.balance,
    });
  }

  user.balance -= UPGRADE_PRICE;
  user.role = "improved";

  writeUsers(users);

  res.json({
    message: "Роль upgraded успішно",
    role: user.role,
    balance: user.balance,
  });
});

export default router;
