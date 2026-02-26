// Frontend/js/chat.js

import { updateLocalState } from "./state.js";
import { renderPet } from "./pet.js";
import { sendChat } from "./api.js";

/* =========================
   SETUP EFFECTS OVERLAY
========================= */
// สร้างเลเยอร์สำหรับเอฟเฟกต์
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
    
    // 1. แสดงข้อความ User ทันที
    addMessage("user", text);
    messageInput.value = "";
    
    // 2. แสดงสถานะ "..."
    const loadingId = addMessage("pet", "..."); 
    
    // ปิดปุ่มชั่วคราว
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "...";
    }

    // 🚀 **ทริคจิตวิทยา: ตอบสนองเอฟเฟกต์ทันที (ไม่ต้องรอ AI)**
    // ทำให้แอปดูเร็วปรู๊ดปร๊าดทันตาเห็น
    const lowerText = text.toLowerCase();
    if (lowerText.match(/เหนื่อย|ท้อ|เศร้า|เบื่อ|ไม่ไหว|ร้องไห้|กอด/)) {
        setTheme("comfort");
        triggerEffect("rainbow");
    } else if (lowerText.match(/เย้|เก่ง|รัก|ดีใจ|ฉลอง|สุดยอด|555/)) {
        setTheme("happy");
        triggerEffect("confetti");
    }
    
    try {
        // 3. ส่งไปหา Server
        const result = await sendChat(text);
        
        // ลบข้อความ "..."
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (result && result.pet) {
            
            // แสดงคำตอบน้องแมว
            addMessage("pet", result.message || "เมี๊ยว~");
            
            // อัปเดต State และท่าทาง
            updateLocalState(result.pet);
            renderPet();
            
            // ✅ 4. จัดการธีมสีห้องตามอารมณ์ที่ AI วิเคราะห์มาจริงๆ
            handleMood(result.emotion || result.pet.emotion);
            
        } else {
            addMessage("pet", "เมี๊ยว... (ระบบมีปัญหา)");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.textContent = "เมี๊ยว... (สัญญาณเน็ตขาด 😿)";
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

// อัปเดตสีห้องตามอารมณ์แมว (AI)
function handleMood(petEmotion) {
    if (!petEmotion) return;

    if (petEmotion === 'comforting' || petEmotion === 'sad') {
        setTheme("comfort"); 
    } 
    else if (petEmotion === 'happy' || petEmotion === 'playful') {
        setTheme("happy");   
    } 
    else if (petEmotion === 'neutral') {
        setTheme("default"); 
    }
}

function setTheme(themeName) {
    document.body.classList.remove("theme-happy", "theme-comfort", "theme-sad");
    if (themeName !== "default") {
        document.body.classList.add(`theme-${themeName}`);
    }
}

function triggerEffect(effectName) {
    const overlay = document.getElementById('effect-overlay');
    if (!overlay) return;

    // เคลียร์ของเก่า และแสดง Overlay
    overlay.innerHTML = ""; 
    overlay.style.display = "block";

    // สร้างกล่องเอฟเฟกต์ใหม่
    const effectDiv = document.createElement('div');
    effectDiv.className = `effect-${effectName}`; 
    overlay.appendChild(effectDiv);

    // ปิด Overlay เมื่อ Animation จบ (4 วินาที)
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
    const id = "msg-" + Date.now() + Math.random().toString(36).substr(2, 9);
    messageDiv.id = id;

    messageDiv.className = `msg ${sender}`; 
    messageDiv.textContent = text;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    return id; 
}