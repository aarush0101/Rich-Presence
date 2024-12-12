const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const WebSocket = require("ws");
const Eris = require("eris");
const keep_alive = require("./src/keep_alive.js");
const {
  logInfo,
  logError,
  validateEnvVariables,
  isStartEnabled,
  isActivityDisabled,
  isTrue,
  logDebug,
} = require("./src/utilities.js");

if (!isStartEnabled()) {
  logError("[ERROR] No permission to start the server...");
  process.exit(1);
}

const GATEWAY_URL = "wss://gateway.discord.gg/?v=9&encoding=json";
let isActivityRunning = false;
let wsMap = new Map();
let erisMap = new Map();
let heartbeatIntervals = new Map();

const userTokens = (process.env.USER_TOKEN || "")
  .split(/\s*,\s*/)
  .filter(Boolean);

if (!userTokens.length) {
  logError("No user tokens provided.");
  process.exit(1);
}

const bot = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
  ],
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

function structureData() {
  if (!isStartEnabled) {
    logError("No permissions to start the server...");
    process.exit(1);
  }

  const activities = [
    {
      name: variables.name,
      type: Number(variables.type),
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

  if (isTrue("TIMESTAMPS")) {
    activities[0].timestamps = { start: Date.now() };
  }

  const data = {
    since: Date.now(),
    status: variables.status,
    afk: false,
    activities: activities,
  };

  return data;
}

function setRichPresence() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const data = structureData();

  ws.send(
    JSON.stringify({
      op: 3,
      d: data,
    })
  );

  logDebug("Rich presence successfully sent...");
}

function connectUserGateway(token) {
  let ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    logInfo(`Connected to Discord Gateway for token: ${token.slice(0, 10)}...`);

    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: token,
          properties: {
            os: "Windows",
            browser: "Chrome",
            device: null,
          },
        },
      })
    );
  });

  ws.on("message", (data) => {
    const payload = JSON.parse(data);

    if (payload.op === 10) {
      const heartbeatIntervalMs = payload.d.heartbeat_interval;

      if (heartbeatIntervals.has(token))
        clearInterval(heartbeatIntervals.get(token));

      const interval = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
        logDebug(`Heartbeat sent for token: ${token.slice(0, 10)}...`);
      }, heartbeatIntervalMs);

      heartbeatIntervals.set(token, interval);

      setTimeout(() => setRichPresence(ws), 1000);
    }
  });

  ws.on("close", (code, reason) => {
    logError(
      `Disconnected from Discord Gateway for token: ${token.slice(
        0,
        10
      )}. Code: ${code}, Reason: ${reason || "No reason provided"}`
    );

    if (heartbeatIntervals.has(token))
      clearInterval(heartbeatIntervals.get(token));

    if (shouldReconnect && ![4004, 4010, 4011].includes(code)) {
      logInfo(`Reconnecting in 5 seconds for token: ${token.slice(0, 10)}...`);
      setTimeout(() => connectUserGateway(token), 5000);
    } else {
      wsMap.delete(token);
    }
  });

  ws.on("error", (error) => {
    logError(`WebSocket error for token: ${token.slice(0, 10)}...`, error);
  });

  wsMap.set(token, ws);
}

function launchEris(token) {
  try {
    logInfo(`Launching Eris for token: ${token.slice(0, 10)}...`);
    const erisInstance = new Eris(token);
    erisInstance.connect();
    erisInstance.on("error", (e) =>
      logError(`Eris runtime error for token: ${token.slice(0, 10)}...`, e)
    );
    erisMap.set(token, erisInstance);
    erisInstance.editStatus(variables.status, []);
    logInfo(`Successfully launched Eris for token: ${token.slice(0, 10)}...`);
  } catch (e) {
    logError(`Failed to launch Eris for token: ${token.slice(0, 10)}.`, e);
  }
}

function shutdown() {
  wsMap.forEach((ws, token) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          op: 3,
          d: {
            activities: [],
            since: null,
            status: "offline",
            afk: false,
          },
        })
      );
      ws.send(
        JSON.stringify({
          op: 3,
          d: {
            status: "offline",
          },
        })
      );
      shouldReconnect = false;
      logDebug(
        `Activity cleared before shutting down WebSocket for token: ${token.slice(
          0,
          10
        )}...`
      );
      ws.close();
    }
  });

  wsMap.clear();
  heartbeatIntervals.forEach((interval) => clearInterval(interval));
  heartbeatIntervals.clear();
}

function disconnectEris() {
  erisMap.forEach((erisInstance, token) => {
    try {
      erisInstance.editStatus("offline", []);
      logInfo(
        `Clearing activity before disconnecting Eris for token: ${token.slice(
          0,
          10
        )}...`
      );
      erisInstance.disconnect();
      logInfo(
        `Successfully disconnected Eris for token: ${token.slice(0, 10)}...`
      );
    } catch (e) {
      logError(
        `Failed to disconnect Eris for token: ${token.slice(0, 10)}.`,
        e
      );
    }
  });

  erisMap.clear();
}

const commands = {
  start: (message) => {
    if (isActivityRunning) {
      message.reply("**Activity is already running. Use `stop` to restart.**");
      return;
    }

    if (isActivityDisabled()) {
      userTokens.forEach((token) => launchEris(token));
    } else {
      userTokens.forEach((token) => connectUserGateway(token));
    }

    isActivityRunning = true;
    message.reply(
      "**Rich Presence started for all tokens. Use `stop` to stop it.**"
    );
  },
  stop: (message) => {
    if (!isActivityRunning) {
      message.reply("**Activity is not running. Use `start` first.**");
      return;
    }

    if (isActivityDisabled()) {
      disconnectEris();
    } else {
      shutdown();
    }

    isActivityRunning = false;
    message.reply(
      "**Rich Presence stopped for all tokens. Use `start` to restart.**"
    );
  },
};

bot.on("messageCreate", async (message) => {
  if (message.channel.id !== variables.channelId) return;
  if (message.author.bot) return;

  const command = message.content.toLowerCase();
  if (commands[command]) {
    try {
      await commands[command](message);
    } catch (error) {
      logError("Command execution error:", error);
    }
  } else {
    message.reply("**Unknown command.**");
  }
});

bot.once("ready", () => {
  bot.user.setPresence({ status: "invisible" });
  logInfo("Bot is online and set to invisible.");
});

bot.on("error", (error) => {
  logError("Bot runtime error:", error);
});

(async () => {
  try {
    await bot.login(variables.botToken);
    logInfo("Bot logged in successfully.");
  } catch (error) {
    logError("Failed to log in for the bot account:", error);
    process.exit(1);
  }
})();

validateEnvVariables();

process.on("SIGINT", () => {
  logInfo("Shutting down...");
  if (ws) shutdown();
  if (eris) disconnectEris();
  bot.destroy();
  process.exit(0);
});
