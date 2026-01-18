import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import usersRouter from "./routes/users.js";
import contactsRouter from "./routes/contacts.js";
import messagesRouter from "./routes/messages.js";
import adminRouter from "./routes/admin.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// FRONTEND
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

// API
app.use("/users", usersRouter);
app.use("/contacts", contactsRouter);
app.use("/messages", messagesRouter);
app.use("/admin", adminRouter);

app.get("/", (req, res) => {
  res.send("Server works");
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
  console.log("Frontend path:", frontendPath);
});
