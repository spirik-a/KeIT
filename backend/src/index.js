import express from "express";
import bodyParser from "body-parser";
import messagesRouter from "./routes/messages.js"; // <-- импортируем новый роут

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// подключаем роут
app.use("/messages", messagesRouter);

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});
app.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${PORT}`
  );
});
