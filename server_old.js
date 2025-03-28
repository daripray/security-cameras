const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

let viewers = [];
let cameras = [];

// Saat ada koneksi baru
wss.on("connection", (ws, req) => {
    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "camera") {
            cameras.push(ws);
        } else if (data.type === "viewer") {
            viewers.push(ws);
        }

        // Relay data dari kamera ke viewer
        if (data.video) {
            viewers.forEach((viewer) => {
                if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(JSON.stringify({ video: data.video }));
                }
            });
        }
    });

    ws.on("close", () => {
        viewers = viewers.filter(v => v !== ws);
        cameras = cameras.filter(c => c !== ws);
    });
});

// Jalankan server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
