import express from "express";
import bodyParser from "body-parser";
import messagesRouter from "./routes/messages.js"; // <-- импортируем новый роут

const app = express();
const PORT = 3000;
app.use(express.json());

app.use(bodyParser.json());

// подключаем роут
app.use("/messages", messagesRouter);

//подключаем статику
app.use(express.static("src/public"));

// функционал апи
app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

// users route
import usersRouter from "./routes/users.js";

app.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${PORT}`
  );
});
