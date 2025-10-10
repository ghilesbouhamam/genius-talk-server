// ============================================================
// GENIUS TALK - SERVEUR EXPRESS + WEBSOCKET 
// ============================================================

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

// --- Initialisation du serveur HTTP + WebSocket ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Liste des utilisateurs connectés : { "0600000000": WebSocket } ---
const clients = {};

// --- Connexion WebSocket ---
wss.on("connection", (ws) => {
  console.log("🟢 Nouvelle connexion WebSocket");

  let currentPhone = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Message reçu :", data);

      // === Étape 1 : Enregistrement utilisateur ===
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

      // === Étape 2 : Envoi de message à un destinataire ===
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

        // Envoi du message au destinataire
        recipient.send(
          JSON.stringify({
            type: "message",
            from,
            text,
          })
        );

        // Réponse de confirmation à l’expéditeur
        ws.send(
          JSON.stringify({
            type: "reply",
            text: `Message envoyé à ${to}.`,
          })
        );

        console.log(`📤 ${from} → ${to} : ${text}`);
        return;
      }

      // === Étape 3 : Gestion des types inconnus ===
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

  // === Étape 4 : Déconnexion ===
  ws.on("close", () => {
    if (currentPhone && clients[currentPhone]) {
      delete clients[currentPhone];
      console.log(`🔴 Déconnexion : ${currentPhone}`);
    } else {
      console.log("🔴 Connexion fermée (non enregistrée)");
    }
  });
});

// --- Route de test HTTP ---
app.get("/", (req, res) => {
  res.send("🌐 Serveur Genius Talk WebSocket en ligne !");
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Genius Talk en écoute sur le port ${PORT}`);
});
