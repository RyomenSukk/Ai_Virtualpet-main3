// ไฟล์นี้ต้องอยู่ที่: Frontend/js/chat.js

import { updatePetState } from "./state.js";
import { renderPet } from "./pet.js";
import { sendChat } from "./api.js";

/* =========================
   CHAT ELEMENTS
========================= */
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

/* =========================
   ADD MESSAGE TO CHAT
========================= */
function addMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `msg ${sender}`;
    messageDiv.textContent = text;
    
    chatBox.appendChild(messageDiv);
    
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================
   SEND MESSAGE
========================= */
export async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    // Show user message
    addMessage("user", text);
    
    // Clear input
    messageInput.value = "";
    
    // Disable button while processing
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "...";
    }
    
    try {
        // Send to backend
        const result = await sendChat(text);
        
        if (result && result.success) {
            // Update pet state (รวม action ที่จะเปลี่ยน animation)
            updatePetState(result.pet);
            
            // เปลี่ยน animation ตามอารมณ์
            renderPet();
            
            // Show pet response
            addMessage("pet", result.message);
            
            // แสดง debug info (ถ้ามี)
            if (result.analysis) {
                console.log("🧠 NLP Analysis:", result.analysis);
                console.log(`  - Intent: ${result.analysis.intent}`);
                console.log(`  - Sentiment: ${result.analysis.sentiment}`);
                console.log(`  - Action: ${result.pet.action}`);
            }
            
            // รอ animation เล่นเสร็จแล้วค่อยกลับเป็น idle
            setTimeout(() => {
                updatePetState({ action: "idle" });
                renderPet();
            }, 3000);
            
        } else {
            addMessage("pet", "เมี๊ยว... ฉันไม่เข้าใจ 😿");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        addMessage("pet", "เมี๊ยว... มีข้อผิดพลาด 😿");
    } finally {
        // Enable button again
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = "Send";
        }
    }
}

/* =========================
   EVENT LISTENERS
========================= */
if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
}

if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    });
}