// Frontend/js/chat.js

import { updateLocalState } from "./state.js";
import { renderPet } from "./pet.js";
import { sendChat } from "./api.js";

/* =========================
   SETUP EFFECTS OVERLAY
========================= */
// สร้างเลเยอร์สำหรับเอฟเฟกต์ (ถ้ายังไม่มีใน HTML)
let effectOverlay = document.getElementById('effect-overlay');
if (!effectOverlay) {
    effectOverlay = document.createElement('div');
    effectOverlay.id = 'effect-overlay';
    document.body.appendChild(effectOverlay);
}

/* =========================
   CHAT INITIALIZATION
========================= */
export function initChat() {
    const sendButton = document.getElementById("send-button");
    const messageInput = document.getElementById("message-input");

    if (sendButton && messageInput) {
        sendButton.addEventListener("click", () => sendMessage());

        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });

        console.log("✅ Chat system initialized.");
    } else {
        console.warn("⚠️ Chat elements not found in HTML.");
    }
}

/* =========================
   SEND MESSAGE LOGIC
========================= */
async function sendMessage() {
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    // 1. แสดงข้อความ User ทันที (ไม่ต้องรอ Server)
    addMessage("user", text);
    messageInput.value = "";
    
    // 2. แสดงสถานะ "..." ทันที เพื่อให้รู้สึกตอบไว
    const loadingId = addMessage("pet", "..."); 
    
    // ปิดปุ่มชั่วคราว
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "...";
    }

    // **ทริคจิตวิทยา:** ถ้า user บ่นเหนื่อย เปลี่ยนสีห้องรอเลย (Pre-emptive comforting)
    if (text.match(/เหนื่อย|ท้อ|เศร้า|เบื่อ|ไม่ไหว/)) {
        setTheme("comfort");
    }
    
    try {
        // 3. ส่งไปหา Server
        const result = await sendChat(text);
        
        // ลบข้อความ "..." ออกเมื่อได้คำตอบ
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (result && result.pet) {
            
            // แสดงคำตอบน้องแมว
            addMessage("pet", result.message || "เมี๊ยว~");
            
            // อัปเดต State และท่าทาง
            updateLocalState(result.pet);
            renderPet();
            
            // ✅ 4. จัดการ Mood & Tone + Effects ตามผลวิเคราะห์
            handleMoodAndEffects(result.analysis, text);
            
        } else {
            addMessage("pet", "เมี๊ยว... (ระบบมีปัญหา)");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        // เปลี่ยน "..." เป็นแจ้งเตือน error
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.textContent = "เมี๊ยว... (เน็ตหลุด 😿)";
    } finally {
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = "Send";
        }
    }
}

/* =========================
   MOOD & EFFECTS MANAGER
========================= */
function handleMoodAndEffects(analysis, userText) {
    if (!analysis) return;

    const { sentiment, intent } = analysis;
    const lowerText = userText.toLowerCase();

    // --- 1. เปลี่ยนธีมสีห้อง (Background) ---
    // ถ้าเศร้า หรือ Intent คือปลอบใจ -> สีเขียว/ฟ้าพาสเทล (Comfort)
    if (intent === 'COMFORT' || sentiment === 'NEGATIVE') {
        setTheme("comfort"); 
    } 
    // ถ้ามีความสุข หรือเล่น -> สีส้ม/เหลือง (Happy)
    else if (sentiment === 'POSITIVE' || intent === 'PLAY' || intent === 'PET') {
        setTheme("happy");   
    } 
    // ปกติ
    else {
        setTheme("default"); 
    }

    // --- 2. Trigger Special Effects (Keyword Trigger) ---
    // ถ้า User บ่นว่าเหนื่อย/ท้อ -> โชว์สายรุ้ง (Rainbow)
    if (lowerText.match(/เหนื่อย|ท้อ|เศร้า|ไม่ไหว|ร้องไห้|กอด/)) {
        triggerEffect("rainbow");
    }
    // ถ้าฉลอง/ดีใจ -> โชว์พลุ (Confetti)
    else if (lowerText.match(/เย้|เก่ง|รัก|ดีใจ|ฉลอง|สุดยอด|555/)) {
        triggerEffect("confetti");
    }
}

function setTheme(themeName) {
    // ลบคลาส theme-* เดิมออกให้หมดก่อน
    document.body.classList.remove("theme-happy", "theme-comfort", "theme-sad");
    
    if (themeName !== "default") {
        document.body.classList.add(`theme-${themeName}`);
    }
}

function triggerEffect(effectName) {
    const overlay = document.getElementById('effect-overlay');
    if (!overlay) return;

    overlay.innerHTML = ""; // เคลียร์เอฟเฟกต์เก่า
    overlay.style.display = "block";

    const effectDiv = document.createElement('div');
    effectDiv.className = `effect-${effectName}`; // ตรงกับ CSS (.effect-rainbow, .effect-confetti)
    overlay.appendChild(effectDiv);

    // เล่นเสร็จแล้วซ่อน (เวลาต้องสัมพันธ์กับ animation ใน CSS)
    setTimeout(() => {
        overlay.style.display = "none";
        overlay.innerHTML = "";
    }, 4000);
}

/* =========================
   UI HELPER
========================= */
function addMessage(sender, text) {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return null;

    const messageDiv = document.createElement("div");
    
    // สร้าง ID เอาไว้ลบ (สำหรับ loading bubble)
    const id = "msg-" + Date.now() + Math.random().toString(36).substr(2, 9);
    messageDiv.id = id;

    messageDiv.className = `msg ${sender}`; 
    messageDiv.textContent = text;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    return id; // ส่ง ID กลับไปเผื่อใช้ลบ
}