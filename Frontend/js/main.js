// Frontend/js/main.js

// ✅ เพิ่ม import showToyInScene
import { initPet, renderPet, showToyInScene } from "./pet.js";
import { updateLocalState } from "./state.js"; 
import { feedPet, playPet } from "./api.js";
import { initChat } from "./chat.js";

/* =========================
   INIT APP
========================= */
async function init() {
  console.log("🚀 App starting...");
  
  // 1. เริ่มระบบสัตว์เลี้ยง (โหลด PIXI และดึงข้อมูลสถานะล่าสุด)
  await initPet();

  // 2. เริ่มระบบแชท
  if (typeof initChat === "function") {
    initChat();
  }

  // 3. ตั้งค่าปุ่มกด
  setupButtons();
}

/* =========================
   SETUP BUTTONS
========================= */
function setupButtons() {
  const feedButton = document.getElementById("feed-button");
  const playButton = document.getElementById("play-button");

  if (feedButton) {
    feedButton.addEventListener("click", async () => {
      try {
        const result = await feedPet();

        if (result && result.pet) {
          updateLocalState(result.pet);
          renderPet();
          if (result.message) showMessage(result.message);
        } else {
          showMessage("เมี๊ยว... ให้อาหารไม่สำเร็จ 😿");
        }
      } catch (err) {
        console.error(err);
        showMessage("เมี๊ยว... มีข้อผิดพลาด 😿");
      }
    });
  }

  if (playButton) {
    playButton.addEventListener("click", async () => {
      // ปุ่มเล่นรวม (สุ่มเล่น) ไม่โชว์ของเล่น
      try {
        const result = await playPet();
        if (result && result.pet) {
          updateLocalState(result.pet);
          renderPet();
          if (result.message) showMessage(result.message);
        }
      } catch (err) { console.error(err); }
    });
  }

  /* --- 🧸 เพิ่มระบบของเล่นเข้าไปในหน้าเว็บอัตโนมัติ --- */
  let toysContainer = document.getElementById("toys-container");
  if (!toysContainer) {
      toysContainer = document.createElement("div");
      toysContainer.id = "toys-container";
      document.body.appendChild(toysContainer);
  }

  // รายชื่อของเล่นและรูป GIF
  const toys = [
      { id: "mouse", src: "assets/Mouse.gif", name: "หนูปลอม" },
      { id: "ball", src: "assets/PinkBall.gif", name: "ลูกบอล" },
      { id: "catToy", src: "assets/CatToy.gif", name: "ไม้ตกแมว" }
  ];

  toys.forEach(toy => {
      const img = document.createElement("img");
      img.src = toy.src;
      img.className = "toy-item";
      img.title = `เล่น${toy.name}`;
      
      img.addEventListener("click", async () => {
          try {
              // ✅ 1. แสดงของเล่นในฉากทันทีที่กด
              showToyInScene(toy.id);

              // ✅ 2. สร้างเอฟเฟกต์พลุที่ปุ่มกด (Optional: ถ้ามี chat.js)
              if (typeof triggerEffect === 'function') {
                 triggerEffect("confetti");
              }

              // 3. เรียก API
              const result = await playPet(toy.id);

              if (result && result.pet) {
                  updateLocalState(result.pet);
                  // renderPet จะทำให้แมวขยับ และจะเคลียร์ของเล่นออกเมื่อหมดเวลาเล่น
                  renderPet();
                  if (result.message) showMessage(result.message);
              }
          } catch (err) {
              console.error(err);
          }
      });

      toysContainer.appendChild(img);
  });
}

/* =========================
   SHOW MESSAGE
========================= */
function showMessage(text) {
  const msgEl = document.getElementById("pet-message");
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.style.opacity = "1";

  // ล้าง Timeout เก่าถ้ามี
  if (msgEl.timeoutId) clearTimeout(msgEl.timeoutId);

  msgEl.timeoutId = setTimeout(() => {
    msgEl.style.opacity = "0";
  }, 3000);
}

// ✅ ใช้ Event Listener เพื่อให้มั่นใจว่า HTML โหลดเสร็จก่อนเริ่มรัน
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}