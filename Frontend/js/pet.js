// ไฟล์นี้ต้องอยู่ที่: Frontend/js/pet.js

import { petState, updatePetState } from "./state.js";
import { clickPet, getPetState } from "./api.js";

/* =========================
   ⚙️ CONFIG: ปรับตำแหน่ง (posX, posY) ได้อิสระที่นี่
   posX: 0 (ซ้าย) - 1 (ขวา)
   posY: 0 (บน) - 1 (ล่าง)
========================= */
const ANIMATION_CONFIG = {
    idle:  { width: 32, height: 32, frames: 10, speed: 0.12, posX: 0.5,  posY: 0.6 },
    play:  { width: 32, height: 32, frames: 4,  speed: 0.15, posX: 0.3,  posY: 0.80 },
    eat:   { width: 32, height: 32, frames: 15, speed: 0.1,  posX: 0.62, posY: 0.8 },
    happy: { width: 32, height: 32, frames: 8,  speed: 0.08, posX: 0.88,  posY: 0.4},
    sleep: { width: 32, height: 32, frames: 4,  speed: 0.05, spacing: 32, posX: 0.5, posY: 0.45 }
};

const DISPLAY_SCALE = 4;
const BASE_PATH = "assets/cat/";

/* =========================
   PIXI APP SETUP
========================= */
// บังคับโหมด NEAREST เพื่อให้ Pixel Art คมชัด ไม่แตก
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export const app = new PIXI.Application({
    width: 800, // ปรับขนาด Canvas ให้กว้างพอสำหรับพื้นที่เล่น
    height: 600,
    backgroundAlpha: 0, 
    antialias: false,   // ปิด antialias สำหรับ Pixel Art
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

document.getElementById("pet-area").appendChild(app.view);

let petSprite;
let animations = {};

/* =========================
   CORE FUNCTIONS
========================= */

async function setup() {
    try {
        console.log("🔄 Loading pet sprites...");
        const textures = await PIXI.Assets.load([
            { alias: 'idle', src: `${BASE_PATH}Idle.png` },
            { alias: 'play', src: `${BASE_PATH}play.png` },
            { alias: 'eat', src: `${BASE_PATH}eat.png` },
            { alias: 'happy', src: `${BASE_PATH}happy.png` },
            { alias: 'sleep', src: `${BASE_PATH}sleep.png` }
        ]);

        // สร้าง Animation โดยเช็คความปลอดภัยของ Config
        for (const key in ANIMATION_CONFIG) {
            if (textures[key]) {
                animations[key] = createAnimation(textures[key], ANIMATION_CONFIG[key]);
            }
        }

        await initPet();
        console.log("✅ Pet ready!");
    } catch (error) {
        console.error("❌ Error loading pet sprites:", error);
        createPlaceholder();
    }
}

function createAnimation(texture, config) {
    // แก้ไข Error: ตรวจสอบว่ามี config ไหม
    if (!config) {
        config = { width: 32, height: 32, frames: 1, speed: 0.1 };
    }

    const { width, height, frames, spacing = 0 } = config;
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

    const textureFrames = [];
    for (let i = 0; i < frames; i++) {
        const x = i * (width + spacing);
        if (x + width <= texture.baseTexture.width) {
            const frame = new PIXI.Texture(
                texture.baseTexture,
                new PIXI.Rectangle(x, 0, width, height)
            );
            textureFrames.push(frame);
        }
    }
    return new PIXI.AnimatedSprite(textureFrames);
}

export function renderPet() {
    const action = petState.action || 'idle';
    const config = ANIMATION_CONFIG[action] || ANIMATION_CONFIG.idle;
    let targetSprite = animations[action] || animations.idle;

    if (!targetSprite) return;

    // เปลี่ยนตัว Sprite เมื่อ Action เปลี่ยน
    if (targetSprite !== petSprite) {
        if (petSprite) {
            app.stage.removeChild(petSprite);
            petSprite.stop();
        }
        petSprite = targetSprite;
        app.stage.addChild(petSprite);
        petSprite.play();
    }

    // ตั้งค่าตำแหน่งและสเกลใหม่ทุกครั้ง (เพื่อให้ปรับ Config แล้วเห็นผลทันที)
    petSprite.anchor.set(0.5, 1); // ยึดเท้าเป็นหลัก ภาพจะไม่ลอย
    petSprite.scale.set(DISPLAY_SCALE);
    petSprite.animationSpeed = config.speed;
    
    // คำนวณตำแหน่งตามขนาดหน้าจอ Canvas
    petSprite.position.set(
        app.screen.width * config.posX, 
        app.screen.height * config.posY
    );

    petSprite.interactive = true;
    petSprite.cursor = "pointer";
    petSprite.off("pointerdown").on("pointerdown", handleClick);
    
    updateStatsUI();
}

/* =========================
   HANDLERS & UTILS
========================= */

async function handleClick() {
    const result = await clickPet();
    if (result && result.success) {
        updatePetState(result.pet);
        renderPet();
        if (result.message) showMessage(result.message);
    }
}

function showMessage(text) {
    const msgEl = document.getElementById("pet-message");
    if (msgEl) {
        msgEl.textContent = text;
        msgEl.style.opacity = "1";
        setTimeout(() => { msgEl.style.opacity = "0"; }, 3000);
    }
}

export async function initPet() {
    const result = await getPetState();
    if (result && result.success) {
        updatePetState(result.pet);
        renderPet();
    }
}

function createPlaceholder() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFF6B9D).drawCircle(0, 0, 40).endFill();
    graphics.position.set(app.screen.width / 2, app.screen.height * 0.8);
    app.stage.addChild(graphics);
    petSprite = graphics;
}

/* =========================
   UPDATE STATS UI (เปลี่ยนเป็นหลอด)
========================= */
function updateStatsUI() {
    const hungerBar = document.getElementById("hunger-bar");
    const happinessBar = document.getElementById("happiness-bar");
    const bondBar = document.getElementById("bond-bar");

    // ปรับความยาวหลอด (0-100%)
    if (hungerBar) {
        hungerBar.style.width = `${Math.min(100, Math.max(0, petState.hunger))}%`;
    }
    
    if (happinessBar) {
        happinessBar.style.width = `${Math.min(100, Math.max(0, petState.happiness))}%`;
    }
    
    if (bondBar) {
        // สมมติว่า Bond เต็มที่ 100 หรือปรับตาม Logic ของคุณ
        bondBar.style.width = `${Math.min(100, Math.max(0, petState.bond))}%`;
    }
}

// ระบบเดินอัตโนมัติ (หยุดเดินถ้าไม่ใช่ท่า idle)
setInterval(() => {
    if (petState.action === 'idle' && Math.random() > 0.8) {
        const targetX = petSprite.position.x + (Math.random() > 0.5 ? 40 : -40);
        // เลื่อน x สั้นๆ เพื่อไม่ให้หลุดตำแหน่งหลักมากเกินไป
        petSprite.position.x = Math.max(50, Math.min(app.screen.width - 50, targetX));
    }
}, 5000);

setup();