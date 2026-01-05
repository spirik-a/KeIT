import upgradeRouter from "./routes/upgrade.js";

import balanceRouter from "./routes/balance.js";

import protectedRouter from "./routes/protected.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import usersRouter from "./routes/users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// статика (frontend)
app.use(
  express.static(path.join(__dirname, "public"))
);

// API routes
app.use("/users", usersRouter);

// (опционально) быстрый healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});

app.use("/protected", protectedRouter);

app.use("/balance", balanceRouter);

app.use("/upgrade", upgradeRouter);
