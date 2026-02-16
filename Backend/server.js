// Backend/server.js (Debug Version)
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs"; // เพิ่ม fs เพื่อเช็คว่ามีโฟลเดอร์จริงไหม
import { fileURLToPath } from "url";
import petRouter from "./routes/pet.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. กำหนด Path ของ Frontend
const frontendPath = path.join(__dirname, '..', 'Frontend');

// 🔍 DEBUG: ปริ้นท์ออกมาดูเลยว่า Path ถูกไหม
console.log("---------------------------------------------------");
console.log("🔍 DEBUGGING PATHS:");
console.log(`1. Backend Folder:   ${__dirname}`);
console.log(`2. Frontend Target:  ${frontendPath}`);
// เช็คว่าโฟลเดอร์มีจริงไหม
if (fs.existsSync(frontendPath)) {
    console.log(`✅ Status: Folder 'Frontend' found!`);
    console.log(`   Contents: ${fs.readdirSync(frontendPath).join(", ")}`);
} else {
    console.log(`❌ Status: Folder 'Frontend' NOT FOUND at this path!`);
    console.log(`   👉 Please check your folder name (Case Sensitive).`);
}
console.log("---------------------------------------------------");

// API Routes
app.use("/api/pet", petRouter);

// Serve Static Files
app.use(express.static(frontendPath));

// Fallback Route
app.get('*', (req, res) => {
    // เช็คก่อนส่ง ว่าไฟล์ index.html มีจริงไหม
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("❌ Error: index.html not found in Frontend folder.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});