import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// доступний будь-якому авторизованому
router.get("/basic", requireAuth, (req, res) => {
  res.json({
    message: "Доступ дозволено (basic)",
    user: req.user.username,
  });
});

// ТІЛЬКИ improved
router.get(
  "/improved",
  requireAuth,
  requireRole("improved"),
  (req, res) => {
    res.json({
      message: "Доступ дозволено (improved)",
      user: req.user.username,
    });
  }
);

export default router;
