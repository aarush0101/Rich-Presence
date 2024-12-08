// app.js
const WebSocket = require("ws");
const { Client, GatewayIntentBits } = require("discord.js");
const AsyncLock = require("async-lock");
require("dotenv").config();

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const lock = new AsyncLock(); // Ensures only one function runs at a time

let ws; // WebSocket connection for the user
let heartbeatIntervalId; // Interval ID for heartbeats
let isActivityRunning = false; // Track if presence activity is running

// Bot Client Initialization
const bot = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
  ],
});

// Connect to Discord Gateway as User
const connectUserGateway = () => {
  if (ws) ws.close(); // Close any existing WebSocket connection

  ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    console.log("Connected to Discord Gateway as a user.");
    // Send Identify payload
    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: process.env.USER_TOKEN,
          properties: {
            os: "Windows",
            browser: "Chrome",
            device: "Desktop",
          },
          compress: false,
        },
      })
    );
  });

  ws.on("message", (data) => {
    const payload = JSON.parse(data);

    if (payload.op === 10) {
      const heartbeatInterval = payload.d.heartbeat_interval;

      if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);

      // Send the first heartbeat immediately
      ws.send(JSON.stringify({ op: 1, d: null }));

      heartbeatIntervalId = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
      }, heartbeatInterval);
    }
  });

  ws.on("close", (code, reason) => {
    console.error(`WebSocket closed: ${code} - ${reason}`);
    if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);

    // Attempt reconnect for non-critical errors
    if (![4004, 4010, 4011].includes(code)) {
      console.log("Reconnecting in 5 seconds...");
      setTimeout(connectUserGateway, 5000);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket Error:", err);
  });
};

// Set Rich Presence
const setRichPresence = (presenceData) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not open. Unable to set presence.");
    return;
  }

  const data = presenceData || {
    since: Date.now(),
    status: process.env.STATUS || "online",
    activities: [
      {
        name: "Playing a cool game",
        type: 0, // 0 = Playing, 1 = Streaming, 2 = Listening, etc.
      },
    ],
    afk: false,
  };

  ws.send(
    JSON.stringify({
      op: 3,
      d: data,
    })
  );
  console.log("Rich Presence updated.");
};

// Bot Ready Event
bot.once("ready", () => {
  console.log("Bot is online.");
  bot.user.setPresence({ status: "invisible" }); // Set bot status to invisible
});

// Bot Command Handling
bot.on("messageCreate", (message) => {
  if (message.channel.id !== process.env.CHANNEL_ID || !message.content) return;

  const command = message.content.toLowerCase();

  lock.acquire("commandLock", async (done) => {
    try {
      if (command === "start") {
        if (isActivityRunning) {
          message.reply("**Activity is already running. Stop it first to restart.**");
          return;
        }
        connectUserGateway();
        isActivityRunning = true;
        setTimeout(setRichPresence, 2000); // Allow time for connection
        message.reply("**Rich Presence started. Use `stop` to halt it.**");
      } else if (command === "stop") {
        if (!isActivityRunning) {
          message.reply("**No active activity. Use `start` first.**");
          return;
        }
        setRichPresence(null); // Clear presence
        isActivityRunning = false;
        message.reply("**Rich Presence stopped. Use `start` to resume.**");
      } else if (command === "restart") {
        if (!isActivityRunning) {
          message.reply("**No active activity. Use `start` first.**");
          return;
        }
        setRichPresence(null); // Clear existing presence
        connectUserGateway();
        setTimeout(setRichPresence, 2000);
        message.reply("**Rich Presence restarted. Use `stop` to halt it.**");
      } else if (["alive", "ping"].includes(command)) {
        const latency = Math.round(bot.ws.ping);
        message.reply(`**Pong! Latency: ${latency} ms**`);
      }
    } catch (err) {
      console.error("Command execution error:", err);
      message.reply("**An error occurred while executing the command. Please try again.**");
    } finally {
      done(); // Release the lock
    }
  });
});

// Prevent Duplicate Bot Instances
if (!process.env.RENDER_INSTANCE_ID) {
  bot.login(process.env.BOT_TOKEN).catch((err) => {
    console.error("Failed to log in:", err);
  });
} else {
  console.log("Bot instance already running. Preventing duplicate execution.");
}

// Handle Bot Errors
bot.on("error", console.error);

// Handle Process Exit
process.on("SIGTERM", () => {
  console.log("Terminating bot process...");
  if (ws) ws.close();
  if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
  process.exit(0);
});
