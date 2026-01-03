import express from "express";
import { randomUUID } from "crypto";

const router = express.Router();

const users = [];

router.post("/register", (req, res) => {
  const { phone, name, username } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json({ error: "phone is required" });
  }

  const user = {
    id: randomUUID(),
    phone,
    name: name || "",
    username: username || "",
    role: "basic",
    balance: 0,
    createdAt: new Date(),
  };

  users.push(user);
  res.json(user);
});

export default router;
