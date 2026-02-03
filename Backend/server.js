import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import petRouter from "./routes/pet.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// ปิด CSP warnings
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    next();
});

// API Routes (ต้องมาก่อน static files!)
app.use("/api/pet", petRouter);

// Serve static files จาก Frontend folder
// __dirname = Backend/, ดังนั้น .. = root, ../Frontend = Frontend/
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

// Serve assets (ถ้า assets อยู่ที่ root)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Fallback: ส่ง index.html สำหรับทุก route ที่ไม่ใช่ API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Frontend', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🐱 Pet server running on http://localhost:${PORT}`);
    console.log(`📁 Serving Frontend from: ${path.join(__dirname, '..', 'Frontend')}`);
    console.log(`📁 Serving assets from: ${path.join(__dirname, '..', 'assets')}`);
});