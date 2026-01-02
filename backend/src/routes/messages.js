import express from "express";
import {
  getMessages,
  postMessage,
} from "../controllers/messagesController.js";

const router = express.Router();

router.get("/", getMessages);
router.post("/", postMessage);

export default router;
