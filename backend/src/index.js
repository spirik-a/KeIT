import express from "express";
import usersRouter from "./routes/users.js";

const app = express();

app.use(express.json());
app.use(express.static("src/public"));

app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

app.listen(3000, () => {
  console.log(
    "Server running on http://localhost:3000"
  );
});
