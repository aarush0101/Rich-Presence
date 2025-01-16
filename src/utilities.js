const path = require("path");
const fs = require("fs");

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logError(message, error = null) {
  console.error(`[ERROR] ${message}`, error || "");
}

function logDebug(message, debug = null) {
  console.debug(`[DEBUG] ${message}`, debug || "");
}

function verifyStatus(status) {
  if (!status) return [false, null];

  const allowedStatuses = ["online", "idle", "dnd", "invisible", "offline"];
  if (!allowedStatuses.includes(status)) {
    logError(`Invalid status provided: ${status}`);
    const refined = status === "offline" ? "invisible" : null;
    return [false, refined];
  }

  return [true, status];
}

function validateEnvVariables() {
  let variable;
  const requiredVariables = ["BOT_TOKEN", "USER_TOKENS", "PREFIX", "SERVER_ID"];
  requiredVariables.forEach((variable) => {
    variable = process.env[variable];
    if (!variable || variable === "" || variable === undefined) {
      logError(`Missing required environment variable: ${variable}`);
      process.exit(1);
    }
  });

  if (!isActivityDisabled && isNaN(Number(process.env.TYPE))) {
    logError("Invalid TYPE in .env file. Must be a number.");
    process.exit(1);
  }
}

function isStartEnabled() {
  const startStates = ["true", "y", "continue", "y"];
  return startStates.includes(process.env.START?.toLowerCase() || "");
}

function isActivityDisabled() {
  const noActivityStates = ["true", "yes", "continue", "y"];
  return noActivityStates.includes(
    process.env.NO_ACTIVITY?.toLowerCase() || ""
  );
}

function isTrue(variable) {
  if (!variable) return false;
  const states = ["true", "yes", "continue", "y"];
  return states.includes(process.env[variable]?.toLowerCase() || "");
}

function isFalse(variable) {
  if (!variable) return false;
  const states = ["false", "no", "back", "n"];
  return states.includes(process.env[variable]?.toLowerCase() || "");
}

function assignGatewayUrl() {
  try {
    const configPath = path.resolve(__dirname, "../settings.conf");
    if (!fs.existsSync(configPath)) {
      return "wss://gateway.discord.gg/?v=9&encoding=json";
    }
    const configFile = fs.readFileSync(configPath, "utf8");

    const match = configFile.match(/GATEWAY_URL="(.+?)"/);

    if (match && match[1]) {
      return match[1];
    } else {
      return "wss://gateway.discord.gg/?v=9&encoding=json";
    }
  } catch (err) {
    return "wss://gateway.discord.gg/?v=9&encoding=json";
  }
}

function logToken(token) {
  if (token.length > 11) {
    return token.slice(0, 10);
  } else {
    return token;
  }
}

function phraseToken(token) {
  if (!token) return null;

  if (!isNaN(token)) {
    return parseInt(token);
  }

  const result = wordsToNumbers(token, { fuzzy: false });
  return result !== null ? result : null;
}

function getVariables() {
  const variables = {
    botToken: process.env.BOT_TOKEN,
    userTokens: process.env.USER_TOKENS,
    serverId: process.env.SERVER_ID,
    prefix: process.env.PREFIX ?? "?",
    largeImageUrl: process.env.LARGE_IMAGE_URL,
    smallImageUrl: process.env.SMALL_IMAGE_URL,
    smallText: process.env.SMALL_TEXT,
    largeText: process.env.LARGE_TEXT,
    timestamps: process.env.TIMESTAMPS ?? "false",
    state: process.env.STATE,
    details: process.env.DETAILS,
    type: process.env.TYPE ?? "0",
    name: process.env.NAME,
    status: process.env.STATUS ?? "online",
    start: process.env.START ?? "true",
    noActivity: process.env.NO_ACTIVITY ?? "false",
  };
  return variables;
}

module.exports = {
  logInfo,
  logError,
  validateEnvVariables,
  isStartEnabled,
  isActivityDisabled,
  isFalse,
  isTrue,
  logDebug,
  assignGatewayUrl,
  verifyStatus,
  phraseToken,
  getVariables,
  logToken,
};
