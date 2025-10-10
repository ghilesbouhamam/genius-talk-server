// ============================================================
// GENIUS TALK - SERVEUR WEBSOCKET AVEC ROUTAGE PAR DESTINATAIRE
// ============================================================

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

  let currentPhone = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Reçu :", data);

      // 1️⃣ Enregistrement de l'utilisateur
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

      // 2️⃣ Envoi de message ciblé
      if (data.type === "message") {
        const { from, to, text } = data;

        if (!from || !to || !text) {
          ws.send(
            JSON.stringify({
              type: "error",
              text: "Champs manquants : 'from', 'to' et 'text' sont requis.",
            })
          );
          return;
        }

        const recipient = clients[to];

        if (recipient && recipient.readyState === ws.OPEN) {
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
        } else {
          ws.send(
            JSON.stringify({
              type: "error",
              text: `Le destinataire ${to} n’est pas connecté.`,
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
      console.error("⚠️ Erreur JSON :", err);
      ws.send(
        JSON.stringify({
          type: "error",
          text: "Format JSON invalide.",
        })
      );
    }
  });

  // 4️⃣ Déconnexion
  ws.on("close", () => {
    if (currentPhone && clients[currentPhone]) {
      delete clients[currentPhone];
      console.log(`🔴 Déconnexion : ${currentPhone}`);
    }
  });
});

// --- Route HTTP simple pour test ---
app.get("/", (req, res) => {
  res.send("🌐 Serveur Genius Talk WebSocket actif !");
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🌐 Serveur Genius Talk en écoute sur le port ${PORT}`);
});
