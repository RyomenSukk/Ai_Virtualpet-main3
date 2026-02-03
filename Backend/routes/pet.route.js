// Backend/routes/pet.route.js

import express from "express";
import {
  handleClick,
  handleChat,
  handleFeed,
  handlePlay,
  getState,
} from "../services/pet.service.js";

const router = express.Router();

// Get current state
router.get("/state", (req, res) => {
  res.json({ success: true, pet: getState() });
});

// Click pet
router.post("/click", (req, res) => {
  const result = handleClick();
  res.json({ success: true, ...result });
});

// Chat with pet (async)
// ✅ รองรับทั้งแบบใหม่ (มี sessionId) และแบบเก่า (ไม่มี sessionId)
router.post("/chat", async (req, res) => {
  const { text, sessionId } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Text is required",
    });
  }

  // ถ้า frontend ยังไม่ส่ง sessionId มา เราสร้างให้ชั่วคราว (ไม่พัง)
  const sid =
    sessionId ||
    `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // ✅ handleChat ต้องถูกแก้ให้รับ (sessionId, text)
    const result = await handleChat(sid, text);
    res.json({ success: true, ...result, sessionId: sid });
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({
      success: false,
      message: "เมี๊ยว... มีข้อผิดพลาด 😿",
    });
  }
});

// Feed pet
router.post("/feed", (req, res) => {
  const result = handleFeed();
  res.json({ success: true, ...result });
});

// Play with pet
router.post("/play", (req, res) => {
  const result = handlePlay();
  res.json({ success: true, ...result });
});

export default router;
