import express from "express";
import { randomUUID } from "crypto";

const router = express.Router();

// временное хранилище пользователей (позже будет БД)
const users = [];

/**
 * POST /users/register
 * body: { phone, name, username }
 */
router.post("/register", (req, res) => {
  const { phone, name, username } = req.body;

  // базовая валидация
  if (!phone || !name || !username) {
    return res
      .status(400)
      .json({ error: "Missing required fields" });
  }

  // проверка на существующего пользователя по телефону
  const existingUser = users.find(
    (u) => u.phone === phone
  );
  if (existingUser) {
    return res
      .status(409)
      .json({ error: "User already exists" });
  }

  // создание пользователя
  const newUser = {
    id: randomUUID(),
    phone,
    name,
    username,
    role: "basic",
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  return res.status(201).json(newUser);
});

export default router;
