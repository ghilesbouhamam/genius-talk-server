// ============================================================
// GENIUS TALK - SERVEUR EXPRESS + WEBSOCKET
// ============================================================
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = {}; // { "phone": WebSocket }

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", (_, res) => res.send("🌐 Serveur Genius Talk opérationnel !"));
app.get("/users", (_, res) => res.json({ connectedUsers: Object.keys(clients) }));

wss.on("connection", (ws) => {
  console.log("🟢 Nouvelle connexion WebSocket");
  let currentPhone = null;
  ws.isAlive = true;

  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "register") {
        if (!data.phone) {
          ws.send(JSON.stringify({ type: "error", text: "Numéro requis." }));
          return;
        }
        if (clients[data.phone]) {
          clients[data.phone].close(4000, "Connexion remplacée");
        }
        currentPhone = data.phone;
        clients[currentPhone] = ws;
        console.log(`✅ ${currentPhone} enregistré`);
        ws.send(JSON.stringify({ type: "info", text: `Inscription réussie (${currentPhone})` }));
        return;
      }

      if (data.type === "message") {
        const { from, to, text } = data;
        if (!from || !to || !text) {
          ws.send(JSON.stringify({ type: "error", text: "Champs manquants." }));
          return;
        }
        const recipient = clients[to];
        if (!recipient || recipient.readyState !== ws.OPEN) {
          ws.send(JSON.stringify({ type: "error", text: `${to} hors ligne.` }));
          return;
        }
        recipient.send(JSON.stringify({ type: "message", from, text }));
        ws.send(JSON.stringify({ type: "reply", text: `Message envoyé à ${to}` }));
        console.log(`📤 ${from} → ${to} : ${text}`);
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", text: "Format JSON invalide." }));
    }
  });

  ws.on("close", () => {
    if (currentPhone && clients[currentPhone]) {
      delete clients[currentPhone];
      console.log(`🔴 ${currentPhone} déconnecté`);
    }
  });
});

// --- Vérification périodique des connexions WebSocket ---
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 125000;   // légèrement supérieur pour éviter timeouts

// --- Lancement du serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Serveur Genius Talk prêt sur le port ${PORT}`));nius Talk prêt sur le port ${PORT}`));
