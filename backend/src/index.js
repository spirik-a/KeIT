import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import usersRouter from "./routes/users.js";
import contactsRouter from "./routes/contacts.js";
import messagesRouter from "./routes/messages.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

/* API */
app.use("/users", usersRouter);
app.use("/contacts", contactsRouter);
app.use("/messages", messagesRouter);

/* FRONTEND */
app.use(
  express.static(
    path.join(__dirname, "../../frontend")
  )
);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../../frontend/index.html"
    )
  );
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});

/*app.use(
  "/contacts",
  authMiddleware,
  contactsRouter
);
*//*
app.use(
  "/messages",
  authMiddleware,
  messagesRouter
);
*/