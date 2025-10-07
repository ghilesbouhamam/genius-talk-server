import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

// --- Initialisation du serveur Express ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Liste des clients connectés (clé = numéro de téléphone) ---
const clients = {};

// --- Connexion WebSocket ---
wss.on("connection", (ws) => {
  console.log("🟢 Nouvelle connexion WebSocket");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Reçu :", data);

      // 1️⃣ Enregistrement utilisateur
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
        clients[data.phone] = ws;
        ws.phone = data.phone;
        console.log(`✅ Utilisateur enregistré : ${data.phone}`);
        ws.send(
          JSON.stringify({
            type: "info",
            text: `Inscription réussie pour ${data.phone}`,
          })
        );
        return;
      }

      // 2️⃣ Envoi de message
      if (data.type === "message") {
        const { from, to, text } = data;

        if (!from || !to || !text) {
          ws.send(
            JSON.stringify({
              type: "error",
              text: "Message invalide. Les champs 'from', 'to' et 'text' sont requis.",
            })
          );
          return;
        }

        const recipient = clients[to];
        if (recipient) {
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
              text: `Message envoyé à ${to}`,
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "error",
              text: `Le destinataire ${to} n’est pas en ligne.`,
            })
          );
        }
        return;
      }

      // 3️⃣ Message inconnu
      ws.send(
        JSON.stringify({
          type: "error",
          text: "Type de message inconnu.",
        })
      );
    } catch (err) {
      console.error("⚠️ Erreur de traitement :", err);
      ws.send(
        JSON.stringify({
          type: "error",
          text: "Format JSON invalide.",
        })
      );
    }
  });

  ws.on("close", () => {
    if (ws.phone && clients[ws.phone]) {
      delete clients[ws.phone];
      console.log(`🔴 Déconnexion : ${ws.phone}`);
    } else {
      console.log("🔴 Connexion WebSocket fermée (non enregistrée)");
    }
  });
});

// --- Route simple pour test HTTP ---
app.get("/", (req, res) => {
  res.send("🌐 Serveur Genius Talk WebSocket actif !");
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🌐 Serveur Genius Talk en écoute sur le port ${PORT}`);
});
