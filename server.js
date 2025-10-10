// ============================================================
// GENIUS TALK - SERVEUR EXPRESS + WEBSOCKET 
// ============================================================

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

// --- Initialisation du serveur HTTP + WebSocket ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Liste des utilisateurs connectés ---
const clients = {}; // { "0600000000": WebSocket }

// --- Middleware de sécurité ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// --- Route de test HTTP ---
app.get("/", (req, res) => {
  res.send("🌐 Serveur Genius Talk WebSocket opérationnel !");
});

// --- Route pour visualiser les utilisateurs connectés ---
app.get("/users", (req, res) => {
  res.json({ connectedUsers: Object.keys(clients) });
});

// --- Connexion WebSocket ---
wss.on("connection", (ws) => {
  console.log("🟢 Nouvelle connexion WebSocket");
  let currentPhone = null;

  ws.isAlive = true;

  // Heartbeat pour éviter la fermeture automatique
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Message reçu :", data);

      // === Enregistrement utilisateur ===
      if (data.type === "register") {
        if (!data.phone) {
          ws.send(
            JSON.stringify({
              type: "error",
              text: "Le numéro de téléphone est requis pour l'inscription.",
            })
          );
          return;
        }

        currentPhone = data.phone;
        clients[currentPhone] = ws;
        ws.phone = currentPhone;

        console.log(`✅ Utilisateur enregistré : ${currentPhone}`);

        ws.send(
          JSON.stringify({
            type: "info",
            text: `Inscription réussie pour ${currentPhone}`,
          })
        );
        return;
      }

      // === Envoi de message à un destinataire ===
      if (data.type === "message") {
        const { from, to, text } = data;

        if (!from || !to || !text) {
          ws.send(
            JSON.stringify({
              type: "error",
              text: "Champs requis manquants : from, to ou text.",
            })
          );
          return;
        }

        const recipient = clients[to];

        if (!recipient || recipient.readyState !== ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              text: `Le destinataire ${to} n'est pas en ligne.`,
            })
          );
          return;
        }

        // Envoi du message
        recipient.send(
          JSON.stringify({
            type: "message",
            from,
            text,
          })
        );

        ws.send(
          JSON.stringify({
            type: "reply",
            text: `Message envoyé à ${to}.`,
          })
        );

        console.log(`📤 ${from} → ${to} : ${text}`);
        return;
      }

      // === Type inconnu ===
      ws.send(
        JSON.stringify({
          type: "error",
          text: "Type de message inconnu.",
        })
      );
    } catch (err) {
      console.error("⚠️ Erreur de parsing JSON :", err);
      ws.send(
        JSON.stringify({
          type: "error",
          text: "Format JSON invalide.",
        })
      );
    }
  });

  // === Déconnexion ===
  ws.on("close", () => {
    if (currentPhone && clients[currentPhone]) {
      delete clients[currentPhone];
      console.log(`🔴 Déconnexion : ${currentPhone}`);
    } else {
      console.log("🔴 Connexion fermée (non enregistrée)");
    }
  });
});

// --- Vérification périodique des connexions WebSocket (ping/pong) ---
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log("⛔ Connexion inerte supprimée");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // toutes les 30 secondes

// --- Lancement du serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Genius Talk prêt sur le port ${PORT}`);
});
