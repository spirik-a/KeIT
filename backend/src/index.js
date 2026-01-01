// ES-модули
import express from "express";

const app = express();
const PORT = 3000;

// Простейший роут
app.get("/", (req, res) => {
  res.send("Сервер работает, спирик!<br>Привет!");
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
