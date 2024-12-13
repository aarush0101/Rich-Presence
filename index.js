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
  verifyStatus,
} = require("./src/utilities.js");

if (!isStartEnabled()) {
  logError("No permission to start the server...");
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

function setRichPresence(ws, token) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const data = structureData();

  ws.send(
    JSON.stringify({
      op: 3,
      d: data,
    })
  );

  logInfo(`Rich presence successfully sent for token ${token.slice(0, 10)}...`);
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

      setTimeout(() => setRichPresence(ws, token), 1000);
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
      if (wsMap.has(token)) {
        wsMap.delete(token);
      }
    }
  });

  wsMap.set(token, ws);

  ws.on("error", (error) => {
    logError(`WebSocket error for token: ${token.slice(0, 10)}...`, error);
  });
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
  start: async (message) => {
    try {
      if (!message) {
        if (isActivityDisabled()) {
          userTokens.forEach((token) => launchEris(token));
        } else {
          userTokens.forEach((token) => connectUserGateway(token));
        }
        return;
      }
      if (isActivityRunning) {
        message.reply(
          "**Activity is already running. Use `stop` to restart.**"
        );
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
    } catch (e) {
      logError(
        "An unexpected error occurred while executing start command:",
        e
      );
      message.reply(`**An unexpected error occurred: ${e}**`);
    }
  },

  stop: async (message) => {
    try {
      if (!message) {
        if (isActivityDisabled()) {
          disconnectEris();
        } else {
          shutdown();
        }
        return;
      }
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
    } catch (e) {
      logError("An unexpected error occurred while executing stop command:", e);
      message.reply(`**An unexpected error occurred: ${e}**`);
    }
  },

  restart: async (message) => {
    try {
      if (!isActivityRunning) {
        message.reply("**Activity is not running. Use `start` first.**");
        return;
      }

      await commands.stop();
      await commands.start();

      message.reply("**Activity restarted for all tokens.**");
    } catch (e) {
      logError(
        "An unexpected error occurred while executing restart command:",
        e
      );
      message.reply(`**An unexpected error occurred: ${e}**`);
    }
  },
  "edit-status": (message, args) => commands.editstatus(message, args),
  editstatus: (message, args) => {
    try {
      if (erisMap.size === 0) {
        message.reply(
          "**Eris instances are currently shut down. Try again later! You cannot change the status of a rich presence.**"
        );
        return;
      }

      if (args.length === 0) {
        message.reply("**Usage: `editStatus <status>`**");
        return;
      }

      const status = args[0].toLowerCase();
      const [verified, refined] = verifyStatus(status);

      if (!verified) {
        message.reply(
          "**Invalid status. Status should be one of the following: online, dnd, idle, invisible.**"
        );
        return;
      }

      erisMap.forEach((erisInstance, token) => {
        erisInstance.editStatus(refined, []);
        logDebug(
          `Status set to ${refined} for token: ${token.slice(0, 10)}...`
        );
      });

      message.reply(`**Status set to ${refined} for each token.**`);
    } catch (e) {
      logError(
        "An unexpected error occurred while executing editStatus command:",
        e
      );
      message.reply(`**An unexpected error occurred: ${e}**`);
    }
  },

  ping: (message) => {
    try {
      const latency = Math.round(bot.ws.ping);
      message.reply(`**Pong! Latency: ${latency}ms**`);
    } catch (e) {
      logError("An unexpected error occurred while executing ping command:", e);
      message.reply(`**An unexpected error occurred: ${e}**`);
    }
  },
};

bot.on("messageCreate", async (message) => {
  if (message.channel.id !== variables.channelId) return;
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (commands[command]) {
    try {
      await commands[command](message, args);
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
  wsMap.forEach((token, ws) => {
    if (ws || ws.readyState === WebSocket.OPEN) {
      shutdown();
    }
  });
  erisMap.forEach((erisInstance, token) => {
    if (erisInstance) {
      disconnectEris();
    }
  });
  bot.destroy();
  process.exit(0);
});
