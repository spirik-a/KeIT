import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import usersRouter from "./routes/users.js";
import messagesRouter from "./routes/messages.js";
import contactsRouter from "./routes/contacts.js";

const app = express();
const PORT = 3000;

/* ES module helpers */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* middleware */
app.use(express.json());

/* 🔥 СТАТИКА FRONTEND (КЛЮЧОВЕ МІСЦЕ) */
const frontendPath = path.join(
  __dirname,
  "..",
  "..",
  "frontend"
);
app.use(
  "/frontend",
  express.static(frontendPath)
);

/* api */
app.use("/users", usersRouter);
app.use("/messages", messagesRouter);
app.use("/contacts", contactsRouter);

/* root */
app.get("/", (req, res) => {
  res.send("Server works");
});

app.listen(PORT, () => {
  console.log(
    "Server running on http://localhost:" + PORT
  );
  console.log("Frontend path:", frontendPath);
});
