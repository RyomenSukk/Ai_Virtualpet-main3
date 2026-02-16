// Frontend/js/chat.js

// ✅ 1. Import ให้ถูกต้อง (ชื่อต้องตรงกับ state.js)
import { updateLocalState } from "./state.js";
import { renderPet } from "./pet.js";
import { sendChat } from "./api.js";

/* =========================
   CHAT INITIALIZATION
========================= */
export function initChat() {
    const sendButton = document.getElementById("send-button");
    const messageInput = document.getElementById("message-input");

    // ตรวจสอบว่ามีปุ่มจริงไหม ป้องกัน Error
    if (sendButton && messageInput) {
        
        // ผูก Event ปุ่มกดส่ง
        sendButton.addEventListener("click", () => sendMessage());

        // ผูก Event กด Enter
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendMessage();
            }
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
    
    // 1. แสดงข้อความฝั่ง User
    addMessage("user", text);
    messageInput.value = "";
    
    // ปิดปุ่มชั่วคราวระหว่างรอ
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "...";
    }
    
    try {
        // 2. ส่งไปหา Server
        const result = await sendChat(text);
        
        // ✅ 3. เช็คผลลัพธ์ (แก้จาก result.success เป็น result.pet)
        if (result && result.pet) {
            
            // อัปเดต State และเปลี่ยนท่าทาง
            updateLocalState(result.pet);
            renderPet();
            
            // แสดงข้อความตอบกลับจากน้องแมว
            addMessage("pet", result.message || "เมี๊ยว~ (ไม่ได้พูดอะไร)");
            
            // Debug ดูค่า Intent/Sentiment
            if (result.analysis) {
                console.log(`🧠 AI: Intent=${result.analysis.intent}, Sentiment=${result.analysis.sentiment}`);
            }
            
        } else {
            addMessage("pet", "เมี๊ยว... (ระบบมีปัญหา ไม่ได้รับข้อมูล)");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        addMessage("pet", "เมี๊ยว... (เชื่อมต่อ Server ไม่ได้) 😿");
    } finally {
        // เปิดปุ่มให้กดได้อีกครั้ง
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = "Send";
        }
    }
}

/* =========================
   UI HELPER: ADD MESSAGE
========================= */
function addMessage(sender, text) {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return;

    const messageDiv = document.createElement("div");
    // ใส่ class ให้ถูกต้อง (CSS ควรมี .msg.user และ .msg.pet)
    messageDiv.className = `msg ${sender}`; 
    messageDiv.textContent = text;
    
    chatBox.appendChild(messageDiv);
    
    // เลื่อน Scroll ลงล่างสุด
    chatBox.scrollTop = chatBox.scrollHeight;
}