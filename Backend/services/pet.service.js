// Backend/services/pet.service.js
import "dotenv/config";
import { analyzeText, intentToAction } from "./nlp.service.js";
import { generateCatReply } from "./openai.service.js";
import { saveMessage, getRecentMessages, loadPetStateDB, savePetStateDB } from "../db.js"; // ✅ import เพิ่ม

// 🔧 ปรับค่าตรงนี้ได้ตามใจ
const DECAY_RATE_PER_HOUR = {
  hunger: 10,      // ลด 10% ต่อชั่วโมง
  happiness: 5,    // ลด 5% ต่อชั่วโมง
  bond: 2          // ลด 2% ต่อชั่วโมง
};

/** ---------------------------
 * Pet State (In-Memory + DB Sync)
 * --------------------------- */
// กำหนดค่าเริ่มต้น (เผื่อเปิดครั้งแรกสุดที่ยังไม่มี DB)
let petState = {
  hunger: 100,
  happiness: 80,
  bond: 50,
  action: "idle",
  emotion: "neutral",
  lastUpdatedAt: Date.now()
};

// ✅ ฟังก์ชันเริ่มระบบ: โหลดค่าเก่าจาก DB มาทับค่าเริ่มต้น
async function initPetSystem() {
  try {
    const saved = await loadPetStateDB();
    if (saved) {
      console.log("📥 Loaded pet state from database.");
      petState = saved;
      // คำนวณเวลาที่หายไปทันทีที่เปิดเซิร์ฟ
      applyTimeDecay();
    } else {
      console.log("🆕 New pet created. Saving initial state...");
      await savePetStateDB(petState);
    }
  } catch (err) {
    console.error("❌ Error initializing pet state:", err);
  }
}

// เรียกทำงานทันทีเมื่อไฟล์ถูกโหลด
initPetSystem();

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function applyTimeDecay() {
  const now = Date.now();
  const elapsedMs = now - petState.lastUpdatedAt;

  if (!petState.lastUpdatedAt || elapsedMs <= 0) {
    petState.lastUpdatedAt = now;
    return;
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  // ถ้าเวลาผ่านไปน้อยมาก (เช่น request ถี่ๆ) ไม่ต้องคำนวณ
  if (elapsedHours < 0.001) return;

  petState.hunger = clamp(petState.hunger - DECAY_RATE_PER_HOUR.hunger * elapsedHours);
  petState.happiness = clamp(petState.happiness - DECAY_RATE_PER_HOUR.happiness * elapsedHours);
  petState.bond = clamp(petState.bond - DECAY_RATE_PER_HOUR.bond * elapsedHours);

  petState.lastUpdatedAt = now;

  // ✅ บันทึกลง DB (แบบไม่ต้องรอ await เพื่อไม่ให้หน่วง response)
  savePetStateDB(petState).catch(console.error);
}

function updateState(patch) {
  if (!patch) return;

  if (typeof patch.hunger === "number") petState.hunger = clamp(patch.hunger);
  if (typeof patch.happiness === "number") petState.happiness = clamp(patch.happiness);
  if (typeof patch.bond === "number") petState.bond = clamp(patch.bond);

  if (typeof patch.action === "string") petState.action = patch.action;
  if (typeof patch.emotion === "string") petState.emotion = patch.emotion;

  // ✅ บันทึกลง DB ทุกครั้งที่มีการเปลี่ยนค่า
  savePetStateDB(petState).catch(console.error);
}

function autoResetAction(ms = 2000) {
  setTimeout(() => {
    petState.action = "idle";
    // ✅ บันทึกตอนกลับเป็น idle
    savePetStateDB(petState).catch(console.error);
  }, ms);
}

// ✅ route ต้องการตัวนี้
export function getState() {
  applyTimeDecay(); // คำนวณย้อนหลังทุกครั้งก่อนส่ง state ออก
  return { ...petState };
}

/** ---------------------------
 * Simple actions
 * --------------------------- */
export function handleClick() {
  applyTimeDecay();

  updateState({
    action: "happy",
    happiness: petState.happiness + 2,
    bond: petState.bond + 1,
    emotion: "happy"
  });

  autoResetAction(1200);

  return {
    pet: getState(),
    message: "เมี๊ยว~ ลูบหัวแล้วฟินเลย 😺"
  };
}

export function handleFeed() {
  applyTimeDecay();

  updateState({
    action: "eat",
    hunger: 100,
    happiness: petState.happiness + 5,
    emotion: "happy"
  });

  autoResetAction(1500);

  return {
    pet: getState(),
    message: "ง่ำๆ อิ่มแล้วเมี๊ยว~ 😺"
  };
}

export function handlePlay() {
  applyTimeDecay();

  updateState({
    action: "play",
    happiness: petState.happiness + 10,
    bond: petState.bond + 6,
    hunger: petState.hunger + 5,
    emotion: "playful"
  });

  autoResetAction(1800);

  return {
    pet: getState(),
    message: "มาเล่นกัน! โยนบอลมาเลยเมี๊ยว~ 🧶😺"
  };
}

/** ---------------------------
 * Chat Logic
 * --------------------------- */
function fallbackReply({ intent, sentiment }) {
  if (sentiment === "NEGATIVE" || intent === "sad") {
    return {
      reply: "เมี๊ยว… ไม่เป็นไรนะ เราอยู่ตรงนี้ด้วยเสมอ 🫶😿",
      action: "idle",
      emotion: "comforting"
    };
  }
  if (intent === "lonely") {
    return {
      reply: "เหงาหรอเมี๊ยว~ มาเล่นด้วยกันไหม หรืออยากเล่าอะไรให้ฟัง 😺",
      action: "play",
      emotion: "playful"
    };
  }
  return {
    reply: "เมี๊ยว~ แล้วต่อจากนี้อยากทำอะไรดี 😸",
    action: "idle",
    emotion: "neutral"
  };
}

export async function handleChat(sessionId, text) {
  applyTimeDecay(); // อัปเดตเวลาก่อนเริ่มคิด

  // 1) NLP
  let analysis = { intent: "unknown", sentiment: "NEUTRAL" };
  try {
    analysis = await analyzeText(text);
  } catch (e) {
    console.error("NLP analyzeText failed:", e?.message || e);
  }

  const { intent, sentiment } = analysis;

  // 2) History
  let history = [];
  try {
    history = await getRecentMessages(sessionId, 12);
  } catch (e) {
    console.error("DB getRecentMessages failed:", e?.message || e);
  }

  // 3) LLM Generation
  let ai;
  try {
    ai = await generateCatReply({
      userText: text,
      history,
      analysis,
      petState // ส่ง state ที่อัปเดตแล้ว
    });
  } catch (e) {
    console.error("OpenAI generateCatReply failed:", e?.message || e);
    ai = fallbackReply({ intent, sentiment });
  }

  // 4) Map Action
  const action = ai.action || intentToAction(intent);

  // 5) Update State Logic
  let happinessChange = 0, bondChange = 0, hungerChange = 0;

  if (action === "play") { happinessChange += 12; bondChange += 8; hungerChange += 5; }
  if (action === "eat")  { happinessChange += 6;  hungerChange -= 20; }
  if (action === "happy"){ happinessChange += 8;  bondChange += 4; }
  if (action === "sleep"){ happinessChange += 3;  hungerChange += 1; }

  if (sentiment === "NEGATIVE") {
    bondChange += 4;
    if (!ai.emotion) ai.emotion = "comforting";
  } else if (sentiment === "POSITIVE") {
    happinessChange += 2;
    bondChange += 2;
  }

  updateState({
    action,
    happiness: petState.happiness + happinessChange,
    bond: petState.bond + bondChange,
    hunger: petState.hunger + hungerChange,
    emotion: ai.emotion || "neutral"
  });

  autoResetAction(2000);

  // 6) Save Chat History
  try {
    await saveMessage({
      sessionId,
      role: "user",
      text,
      intent,
      sentiment,
      petState: getState()
    });

    await saveMessage({
      sessionId,
      role: "assistant",
      text: ai.reply,
      intent,
      sentiment,
      petState: getState()
    });
  } catch (e) {
    console.error("DB saveMessage failed:", e?.message || e);
  }

  return {
    pet: getState(),
    message: ai.reply,
    analysis
  };
}