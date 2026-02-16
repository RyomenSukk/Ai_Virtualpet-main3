// Frontend/js/pet.js

// ✅ Import แบบ Relative Path (เพราะอยู่โฟลเดอร์เดียวกัน)
import { petState, updateLocalState } from "./state.js";
import { getPetState, clickPet } from "./api.js";

/* =========================
   ⚙️ CONFIG: ตั้งค่า Animation
========================= */
const ANIMATION_CONFIG = {
    // แก้ไขจำนวน frames ให้ตรงกับไฟล์รูปจริงของคุณ
    idle:  { width: 32, height: 32, frames: 10, speed: 0.1,  posX: 0.5, posY: 0.7 },
    play:  { width: 32, height: 32, frames: 4,  speed: 0.15, posX: 0.5, posY: 0.7 },
    eat:   { width: 32, height: 32, frames: 15, speed: 0.1,  posX: 0.5, posY: 0.7 },
    happy: { width: 32, height: 32, frames: 8,  speed: 0.1,  posX: 0.5, posY: 0.7 },
    sleep: { width: 32, height: 32, frames: 4,  speed: 0.05, posX: 0.5, posY: 0.7 }
};

const DISPLAY_SCALE = 4; 
const BASE_PATH = "assets/cat/"; 

/* =========================
   PIXI SETUP
========================= */
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export const app = new PIXI.Application({
    width: 600,
    height: 400,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

const petArea = document.getElementById("pet-area");
if (petArea) {
    petArea.appendChild(app.view);
}

let petSprite;
let currentAction = "";
const animations = {}; 

/* =========================
   CORE LOGIC
========================= */

export async function initPet() {
    console.log("🚀 Initializing Pet...");
    await loadAssets();
    await syncData(); // ดึงข้อมูลครั้งแรกจาก DB
    startSyncLoop();  // เริ่มดึงข้อมูลอัตโนมัติเพื่อให้หลอดลดลงตามเวลาจริง
}

async function loadAssets() {
    const assetsToLoad = [
        { alias: 'idle', src: `${BASE_PATH}idle.png` },
        { alias: 'play', src: `${BASE_PATH}play.png` },
        { alias: 'eat',  src: `${BASE_PATH}eat.png` },
        { alias: 'happy',src: `${BASE_PATH}happy.png` },
        { alias: 'sleep',src: `${BASE_PATH}sleep.png` }
    ];

    try {
        const textures = await PIXI.Assets.load(assetsToLoad);

        for (const key in ANIMATION_CONFIG) {
            if (textures[key]) {
                animations[key] = createAnimation(textures[key], ANIMATION_CONFIG[key]);
            }
        }
        console.log("✅ Assets loaded!");
    } catch (e) {
        console.error("❌ Failed to load assets:", e);
    }
}

function createAnimation(texture, config) {
    const frames = [];
    const { width, height } = config;
    
    for (let i = 0; i < config.frames; i++) {
        if (i * width < texture.baseTexture.width) {
            const rect = new PIXI.Rectangle(i * width, 0, width, height);
            const frame = new PIXI.Texture(texture.baseTexture, rect);
            frames.push(frame);
        }
    }

    if (frames.length === 0) frames.push(texture);

    const anim = new PIXI.AnimatedSprite(frames);
    anim.animationSpeed = config.speed;
    anim.scale.set(DISPLAY_SCALE);
    anim.anchor.set(0.5, 1); 
    
    anim.eventMode = 'static';
    anim.cursor = 'pointer';
    anim.on('pointerdown', handlePetClick);

    return anim;
}

export function renderPet() {
    // ใช้ค่าจาก petState (ที่ import มาจาก state.js)
    const action = petState.action || 'idle';

    if (currentAction === action && petSprite) {
        updateStatsUI(); // ถึงไม่เปลี่ยนท่า ก็ต้องอัปเดตหลอดเลือด
        return;
    }

    if (petSprite) {
        app.stage.removeChild(petSprite);
        petSprite.stop();
    }

    petSprite = animations[action] || animations['idle'];
    
    if (petSprite) {
        currentAction = action;
        const config = ANIMATION_CONFIG[action] || ANIMATION_CONFIG.idle;

        petSprite.x = app.screen.width * config.posX;
        petSprite.y = app.screen.height * config.posY;

        app.stage.addChild(petSprite);
        petSprite.play();
    }
    
    updateStatsUI();
}

/* =========================
   SYNC & UPDATE
========================= */

async function syncData() {
    try {
        const res = await getPetState();
        // ตรวจสอบโครงสร้างข้อมูลที่ส่งกลับมา (บางครั้ง Backend ส่ง {success: true, pet: {...}})
        const data = res.pet ? res.pet : res; 
        
        if (data) {
            updateLocalState(data);
            renderPet();
        }
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

function startSyncLoop() {
    // ตั้งค่า Interval ให้ดึงข้อมูลทุก 5 วินาที
    setInterval(async () => {
        const res = await getPetState();
        const data = res.pet ? res.pet : res;

        if (data) {
            updateLocalState(data);
            // อัปเดตเฉพาะหลอดเลือดและ UI โดยไม่ต้อง renderPet ใหม่ทั้งหมดถ้าท่าทางไม่เปลี่ยน
            updateStatsUI();
        }
    }, 5000); 
}

function updateStatsUI() {
    const hungerBar = document.getElementById("hunger-bar");
    const happinessBar = document.getElementById("happiness-bar");
    const bondBar = document.getElementById("bond-bar");

    // ปรับให้รองรับทศนิยมและป้องกันค่าติดลบ/เกินร้อย
    if (hungerBar) {
        const h = Math.min(100, Math.max(0, petState.hunger));
        hungerBar.style.width = `${h}%`;
    }
    if (happinessBar) {
        const hap = Math.min(100, Math.max(0, petState.happiness));
        happinessBar.style.width = `${hap}%`;
    }
    if (bondBar) {
        const b = Math.min(100, Math.max(0, petState.bond));
        bondBar.style.width = `${b}%`;
    }
}

async function handlePetClick() {
    if (petState.action === 'eat' || petState.action === 'play') return;

    if (petSprite) {
        petSprite.scale.set(DISPLAY_SCALE * 1.1);
        setTimeout(() => petSprite.scale.set(DISPLAY_SCALE), 100);
    }

    const res = await clickPet();
    const data = res.pet ? res.pet : res;

    if (data) {
        updateLocalState(data);
        renderPet();
        
        const msgEl = document.getElementById("pet-message");
        if (msgEl) {
            msgEl.textContent = res.message || "เมี๊ยว~";
            msgEl.style.opacity = 1;
            setTimeout(() => msgEl.style.opacity = 0, 2000);
        }
    }
}