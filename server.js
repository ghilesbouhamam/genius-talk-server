// Genius Talk - Serveur WebSocket
// Auteur : Tinhinene Machene 
// Fonction : Communication temps réel entre utilisateurs Android

const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Stocke les clients connectés : { "1234": WebSocket }
const clients = new Map();

wss.on("connection", (ws) => {
  console.log("📱 Nouveau client connecté.");

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      const { type, phone, to, text } = message;

      switch (type) {
        case "register":
          clients.set(phone, ws);
          console.log(`✅ Client enregistré : ${phone}`);
          ws.send(JSON.stringify({ type: "system", text: "Enregistré sur Genius Talk" }));
          break;

        case "message":
          console.log(`💬 ${phone} → ${to}: ${text}`);
          const recipient = clients.get(to);
          if (recipient && recipient.readyState === WebSocket.OPEN) {
            recipient.send(JSON.stringify({ from: phone, text }));
          } else {
            console.log(`⚠️ Destinataire ${to} non connecté.`);
            ws.send(JSON.stringify({ type: "error", text: `Le destinataire ${to} n’est pas en ligne.` }));
          }
          break;

        default:
          ws.send(JSON.stringify({ type: "error", text: "Type de message non reconnu." }));
      }
    } catch (err) {
      console.error("❌ Erreur JSON :", err);
      ws.send(JSON.stringify({ type: "error", text: "Message invalide." }));
    }
  });

  ws.on("close", () => {
    // Retirer le client déconnecté
    for (const [phone, socket] of clients.entries()) {
      if (socket === ws) {
        clients.delete(phone);
        console.log(`🔌 Déconnexion : ${phone}`);
        break;
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("🚀 Genius Talk WebSocket Server est en ligne !");
});

// Render.com définit automatiquement process.env.PORT
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🌐 Serveur Genius Talk en écoute sur le port ${PORT}`);
});
