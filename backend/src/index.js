import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import usersRouter from "./routes/users.js";
import contactsRouter from "./routes/contacts.js";
import messagesRouter from "./routes/messages.js";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// KeIT/frontend
const frontendPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend"
);

app.use(
  "/frontend",
  express.static(frontendPath)
);
app.get("/", (req, res) =>
  res.send("Server works")
);

app.use("/users", usersRouter);
app.use("/contacts", contactsRouter);
app.use("/messages", messagesRouter);

// JSON 404 для API, щоб не прилітав HTML
app.use((req, res) => {
  if (
    req.path.startsWith("/users") ||
    req.path.startsWith("/contacts") ||
    req.path.startsWith("/messages")
  ) {
    return res
      .status(404)
      .json({ error: "Not found" });
  }
  res.status(404).send("Not found");
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
  console.log(`Frontend path: ${frontendPath}`);
});
