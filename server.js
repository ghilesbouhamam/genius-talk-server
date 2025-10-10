// ============================================================
// GENIUS TALK - SERVEUR EXPRESS + WEBSOCKET (VERSION FINALE)
// ============================================================

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

// --- Initialisation HTTP + WebSocket ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Liste des utilisateurs connectés ---
const clients = {}; // { "0600000000": WebSocket }

// --- Middleware CORS et JSON ---
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// --- Routes HTTP ---
app.get("/", (req, res) => {
  res.send("🌐 Serveur Genius Talk WebSocket opérationnel !");
});

app.get("/users", (req, res) => {
  res.json({ connectedUsers: Object.keys(clients) });
});

// --- Gestion WebSocket ---
wss.on("connection", (ws, req) => {
  console.log("🟢 Nouvelle connexion WebSocket");
  let currentPhone = null;
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Reçu :", data);

      // === Étape 1 : Inscription utilisateur ===
      if (data.type === "register") {
        if (!data.phone) {
          ws.send(JSON.stringify({ type: "error", text: "Numéro requis." }));
          return;
        }

        currentPhone = data.phone;
        clients[currentPhone] = ws;
        ws.phone = currentPhone;
        console.log(`✅ ${currentPhone} enregistré`);

        ws.send(JSON.stringify({
          type: "info",
          text: `Inscription réussie (${currentPhone})`
        }));
        return;
      }

      // === Étape 2 : Envoi d’un message ===
      if (data.type === "message") {
        const { from, to, text } = data;
        if (!from || !to || !text) {
          ws.send(JSON.stringify({
            type: "error",
            text: "Champs requis manquants (from, to, text)."
          }));
          return;
        }

        const recipient = clients[to];
        if (!recipient || recipient.readyState !== ws.OPEN) {
          ws.send(JSON.stringify({
            type: "error",
            text: `Destinataire ${to} hors ligne.`
          }));
          return;
        }

        // Envoi du message
        recipient.send(JSON.stringify({ type: "message", from, text }));
        ws.send(JSON.stringify({ type: "reply", text: `Message envoyé à ${to}` }));

        console.log(`📤 ${from} → ${to} : ${text}`);
        return;
      }

      // === Type de message inconnu ===
      ws.send(JSON.stringify({ type: "error", text: "Type inconnu." }));
    } catch (err) {
      console.error("⚠️ Erreur parsing JSON :", err.message);
      ws.send(JSON.stringify({ type: "error", text: "Format JSON invalide." }));
    }
  });

  // === Étape 3 : Déconnexion ===
  ws.on("close", () => {
    if (currentPhone && clients[currentPhone]) {
      delete clients[currentPhone];
      console.log(`🔴 ${currentPhone} déconnecté`);
    } else {
      console.log("🔴 Connexion WebSocket fermée (non enregistrée)");
    }
  });
});

// --- Ping/Pong keep-alive toutes les 30s ---
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log("⛔ Connexion inactive supprimée");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// --- Lancement du serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Genius Talk en ligne sur le port ${PORT}`);
});
