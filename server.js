const express = require("express");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

// 📂 Buat folder `recordings` jika belum ada
if (!fs.existsSync("recordings")) {
    fs.mkdirSync("recordings");
}

app.use(express.static(path.join(__dirname, "public")));

let viewers = [];
let cameras = [];

// 📌 Setup penyimpanan video berdasarkan ID Kamera
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const cameraId = file.originalname.split("-")[0]; // Ambil ID kamera dari nama file
        const dir = path.join(__dirname, "recordings", cameraId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// 🔹 WebSocket untuk Kamera & Viewer
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "camera") {
            ws.cameraId = data.cameraId; // Simpan ID kamera di koneksi WebSocket
            cameras.push(ws);
        } else if (data.type === "viewer") {
            viewers.push(ws);
        }

        // Kirim video ke viewer berdasarkan kamera ID
        if (data.video) {
            viewers.forEach((viewer) => {
                if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(JSON.stringify({ video: data.video, cameraId: ws.cameraId }));
                }
            });
        }
    });

    ws.on("close", () => {
        viewers = viewers.filter(v => v !== ws);
        cameras = cameras.filter(c => c !== ws);
    });
});

// 🔹 Upload rekaman dengan nama berdasarkan ID kamera
app.post("/upload", upload.single("video"), (req, res) => {
    res.status(200).send("Video tersimpan.");
    
    console.log("Video Tersimpan.");
});

// 🔹 Endpoint untuk mendapatkan daftar kamera (dari folder rekaman)
app.get("/cameras", (req, res) => {
    fs.readdir("recordings", (err, folders) => {
        if (err) {
            return res.status(500).json({ error: "Gagal membaca daftar kamera." });
            
            console.log("Gagal membaca daftar kamera.");
        }
        res.json(folders);
    });
});

// 🔹 Endpoint untuk mendapatkan daftar rekaman dari kamera tertentu
app.get("/recordings/:cameraId", (req, res) => {
    const cameraId = req.params.cameraId;
    const dir = path.join(__dirname, "recordings", cameraId);

    fs.readdir(dir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: "Gagal membaca rekaman." });
            console.log("Gagal membaca rekaman.");
            
        }
        res.json(files);
    });
});

// 🔹 Sajikan rekaman agar bisa diakses di viewer
app.use("/recordings", express.static(path.join(__dirname, "recordings")));

// Jalankan server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
