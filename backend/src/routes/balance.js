import express from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
const usersPath = path.resolve(
  "src/storage/users.json"
);

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

/* ===== GET BALANCE ===== */
router.get("/", requireAuth, (req, res) => {
  res.json({
    balance: req.user.balance,
  });
});

/* ===== ADD BALANCE (TEST MODE) ===== */
router.post("/add", requireAuth, (req, res) => {
  const { amount } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res
      .status(400)
      .json({ error: "Некоректна сума" });
  }

  const users = readUsers();
  const user = users.find(
    (u) => u.id === req.user.id
  );

  if (!user) {
    return res
      .status(404)
      .json({ error: "Користувача не знайдено" });
  }

  user.balance += amount;
  writeUsers(users);

  res.json({
    balance: user.balance,
  });
});

export default router;
