import express from "express"; // используем ES-модули
const router = express.Router();

// массив для хранения сообщений (пока без базы)
let messages = [];

// GET /messages — получить все сообщения
router.get("/", (req, res) => {
  res.json(messages);
});

// POST /messages — добавить новое сообщение
router.post("/", (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) {
    return res
      .status(400)
      .json({ error: "user and text required" });
  }
  const newMessage = {
    user,
    text,
    timestamp: new Date(),
  };
  messages.push(newMessage);
  res.json(newMessage);
});

export default router;
