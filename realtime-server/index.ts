import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import http from "http";
import { WorldRoom } from "./WorldRoom";

const port = Number(process.env.PORT || 2567);
const app = express();
const server = http.createServer(app);

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.send("Colyseus server is healthy");
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

gameServer.define("world", WorldRoom);

server.listen(port, () => {
  console.log(`Colyseus server is listening on port ${port}`);
});
