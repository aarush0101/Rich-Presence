const { Client, GatewayIntentBits } = require("discord.js");
const WebSocket = require("ws");
require("dotenv").config();
const keep_alive = require("./src/keep_alive.js");

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

let ws;
let isActivityRunning = false;
let heartbeatIntervalId; 
let presenceIntervalId;

const bot = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
  ],
});

bot.once('ready', () => {
  bot.user.setPresence({
    status: 'invisible', 
  });
  console.log('Bot is now invisible.');
});



function getVariables() {
  const variables = {
    botToken: process.env.BOT_TOKEN,
    userToken: process.env.USER_TOKEN,
    channelId: process.env.CHANNEL_ID,
    largeImageUrl: process.env.LARGE_IMAGE_URL,
    smallImageUrl: process.env.SMALL_IMAGE_URL,
    smallText: process.env.SMALL_TEXT,
    largeText: process.env.LARGE_TEXT,
    timestamps: process.env.TIMESTAMPS, 
    state: process.env.STATE,
    details: process.env.DETAILS,
    type: process.env.TYPE,
    name: process.env.NAME,
    status: process.env.STATUS,
    start: process.env.START,
    noActivity: process.env.NO_ACTIVITY,
  };
  return variables;
}

const variables = getVariables();

const BOT_TOKEN = variables.botToken;
const USER_TOKEN = variables.userToken;
const CHANNEL_ID = variables.channelId;

if (!["true", "yes", "continue", "y"].includes(variables.start.toLowerCase())) {
  console.error(
    "Missing permission to start activity. Please re-check your configuration and try again."
  );
  process.exit(1);
}

if (!BOT_TOKEN || !USER_TOKEN || !CHANNEL_ID) {
  console.error(
    "Missing BOT_TOKEN or USER_TOKEN or CHANNEL_ID in .env file. Please re-check your configuration and try again."
  );
  process.exit(1);
}

function getJSON() {
  if (
    !["true", "yes", "continue", "y"].includes(variables.start.toLowerCase())
  ) {
    console.error(
      "Missing permission to start activity. Please re-check your configuration and try again."
    );
    process.exit(1);
  }

  const activities = [
    {
      name: variables.name,
      type: variables.type,
      details: variables.details,
      state: variables.state,
      assets: {
        large_image: variables.largeImageUrl,
        large_text: variables.largeText,
        small_image: variables.smallImageUrl,
        small_text: variables.smallText,
      },
    },
  ];

  // Only add timestamps if noActivity is "false"
  if (
    !["false", "no", "back", "n"].includes(variables.timestamps.toLowerCase()) &&
    !["true", "yes", "continue", "y"].includes(variables.noActivity.toLowerCase())
  ) {
    activities[0].timestamps = { start: Date.now() };
  }

  const data = {
    since: Date.now(),
    status: variables.status,
    afk: false,
  };

  // Add activities only if noActivity is not "true", "no", "back", or "n"
  if (!["true", "no", "back", "n"].includes(variables.noActivity.toLowerCase())) {
    data.activities = activities;
  }

  // If noActivity is true, ensure activities are omitted
  if (variables.noActivity.toLowerCase() === "true") {
    delete data.activities; // Explicitly remove activities if noActivity is true
  }

  console.log("Payload being sent:", JSON.stringify({ op: 3, d: data }, null, 2));
  return data;
}

function setRichPresence() {
  // Check WebSocket state before sending
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const data = getJSON();

  ws.send(
    JSON.stringify({
      op: 3, 
      d: data,
    })
  );

  console.log("Rich Presence successfully set.");
}

function connectUserGateway() {
  if (ws) ws.close(); // Close any existing WebSocket connection

  ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    console.log("User connected to Discord Gateway...");

    // Send Identify payload
    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: USER_TOKEN,
          properties: {
            os: "Windows",
            browser: "Chrome",
            device: null,
          },
          compress: false,
        },
      })
    );

    // Clear any existing presence interval to prevent duplication
    if (presenceIntervalId) clearInterval(presenceIntervalId);

    // Start a new interval to update Rich Presence every 15 seconds
    presenceIntervalId = setInterval(() => {
      setRichPresence();
    }, 15000);
  });

  ws.on("message", (data) => {
    const payload = JSON.parse(data);

    // Handle heartbeat interval from the server
    if (payload.op === 10) {
      const heartbeatInterval = payload.d.heartbeat_interval;

      if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);

      // Send initial heartbeat and set up regular heartbeats
      heartbeatIntervalId = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null })); // Send heartbeat
      }, heartbeatInterval);
      console.log("Heartbeat interval set.");
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`User disconnected from Discord Gateway. Code: ${code}, Reason: ${reason}`);

    // Clear intervals on disconnect to avoid memory leaks
    if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
    if (presenceIntervalId) clearInterval(presenceIntervalId);

    // Attempt to reconnect for recoverable errors
    if (![4004, 4010, 4011].includes(code)) {
      console.log("Attempting to reconnect in 5 seconds...");
      setTimeout(connectUserGateway, 5000);
    } else {
      console.error("Critical error. Manual intervention required.");
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
}


bot.on("messageCreate", (message) => {
  if (message.channel.id !== CHANNEL_ID) return;

  if (!message.content) return;

  const command = message.content.toLowerCase();

  try{
    if (command === "start") {
      if (isActivityRunning) {
        message.reply("**Activity is already running. Please stop and run it again if you want to restart it.**");
        return;
      }

      connectUserGateway();
      isActivityRunning = true;
      setTimeout(setRichPresence, 2000); // Ensure WebSocket is connected
      message.reply("**Rich Presence started. To stop, simply type `stop`, to restart, simply type `restart`.**");
    } else if (command === "stop") {
      if (!isActivityRunning) {
        message.reply("**Activity is not running. Use `start` first**");
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      isActivityRunning = false;
      message.reply("**Rich Presence stopped. You can restart it again using `start`.***");
    } else if (["alive", "ping"].includes(command.toLowerCase())) { 
      const latency = Math.round(bot.ws.ping)
      message.reply(`**Pong! Latency: ${latency} ms**`);
    } else if (command === "restart") {
      if (!isActivityRunning) {
        message.reply("**Activity is not running. Use `start` first.**");
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      connectUserGateway();
      setTimeout(setRichPresence, 2000);
      message.reply("**Rich Presence restarted. To stop, simply use `stop`.**");
    }
  }
  catch (e) { 
    console.error("Rich presence backend exception: ", e)
  }
});

bot
  .login(BOT_TOKEN)
  .then(() => {
    console.log("Bot is online and ready to monitor commands.");
  })
  .catch((e) => {
    console.error("An error occurred while starting the bot: ", e);
  });

bot.on("error", (e) => {
  console.error("An error occurred during runtime of the bot: ", e); 
});
