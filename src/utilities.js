/**
 * src/utilities.js
 * ----------------
 *
 * Implements various utility functions for logging, environment variable validation,
 * status verification, and configuration management.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const path = require("path");
const fs = require("fs");
const { wordsToNumbers } = require("words-to-numbers");

/**
 * Logs an information message to the console with an INFO prefix.
 *
 * @param {string} message - The information message to log
 * @returns {void}
 *
 * @example
 * logInfo("Server started successfully");
 */
function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

/**
 * Logs an error message to the console with an ERROR prefix.
 *
 * @param {string} message - The error message to log
 * @param {Error|string|null} error - Optional error object or additional message
 * @returns {void}
 *
 * @example
 * logError("Failed to connect to server");
 * logError("Connection error", new Error("Timeout"));
 */
function logError(message, error = null) {
  console.error(`[ERROR] ${message}`, error || "");
}

/**
 * Logs a debug message to the console with a DEBUG prefix.
 *
 * @param {string} message - The debug message to log
 * @param {*} debug - Optional debug data to include
 * @returns {void}
 *
 * @example
 * logDebug("Processing payload");
 * logDebug("Received data", { id: 123, status: "active" });
 */
function logDebug(message, debug = null) {
  console.debug(`[DEBUG] ${message}`, debug || "");
}

/**
 * Verifies if the provided Discord status is valid.
 *
 * @param {string} status - The status to verify
 * @returns {Array} A tuple containing [isValid, statusOrRefinement] where:
 *                  - isValid: boolean indicating if status is valid
 *                  - statusOrRefinement: the original status if valid, a suggested
 *                    replacement if possible, or null if invalid with no suggestion
 *
 * @example
 * const [isValid, status] = verifyStatus("online");  // [true, "online"]
 * const [isValid, status] = verifyStatus("away");    // [false, null]
 * const [isValid, status] = verifyStatus("offline"); // [false, "invisible"]
 */
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

/**
 * Validates required environment variables and their formats.
 *
 * Checks for the presence of required environment variables and validates
 * the TYPE variable to ensure it's a number. Exits the process with an
 * error code if validation fails.
 *
 * @returns {void}
 * @throws {Error} Exits the process if validation fails
 *
 * @example
 * validateEnvVariables();
 */
function validateEnvVariables() {
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

/**
 * Checks if the application is allowed to start based on the START environment variable.
 *
 * @returns {boolean} True if the application is allowed to start, false otherwise
 *
 * @example
 * if (!isStartEnabled()) {
 *   logError("No permission to start the server...");
 *   process.exit(1);
 * }
 */
function isStartEnabled() {
  const startStates = ["true", "y", "continue", "y"];
  return startStates.includes(process.env.START?.toLowerCase() || "");
}

/**
 * Checks if activity/rich presence functionality is disabled.
 *
 * @returns {boolean} True if activity functionality is disabled, false otherwise
 *
 * @example
 * if (isActivityDisabled()) {
 *   logInfo("Rich presence functionality is disabled");
 * }
 */
function isActivityDisabled() {
  const noActivityStates = ["true", "yes", "continue", "y"];
  return noActivityStates.includes(process.env.NO_ACTIVITY?.toLowerCase() || "");
}

/**
 * Checks if server functionality is enabled based on the START_SERVER environment variable.
 *
 * @returns {boolean} True if the server functionality is enabled, false otherwise
 *
 * @example
 * if (isServerEnabled()) {
 *   startWebServer();
 * }
 */
function isServerEnabled() {
  const startServerStates = ["true", "yes", "continue", "y"];
  return startServerStates.includes(process.env.START_SERVER?.toLowerCase() || "");
}

function isTrue(variable) {
  if (!variable) return false;
  const states = ["true", "yes", "continue", "y"];
  return states.includes(process.env[variable]?.toLowerCase() || "");
}

/**
 * Checks if a specified environment variable has a value considered as "false".
 *
 * @param {string} variable - The environment variable name to check
 * @returns {boolean} True if the variable exists and has a "false" value, false otherwise
 *
 * @example
 * if (isFalse("ENABLE_FEATURE")) {
 *   disableFeature();
 * }
 */
function isFalse(variable) {
  if (!variable) return false;
  const states = ["false", "no", "back", "n"];
  return states.includes(process.env[variable]?.toLowerCase() || "");
}

/**
 * Determines the Discord Gateway URL to use from settings or defaults.
 *
 * Attempts to read the gateway URL from the settings.conf file.
 * Falls back to the default Discord Gateway URL if the file doesn't exist
 * or if the URL isn't found in the file.
 *
 * @returns {string} The Discord Gateway URL to use
 *
 * @example
 * const gatewayUrl = assignGatewayUrl();
 * const ws = new WebSocket(gatewayUrl);
 */
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
    logError("Error reading settings.conf", err);
    return "wss://gateway.discord.gg/?v=9&encoding=json";
  }
}

/**
 * Returns a safe version of a token for logging purposes.
 *
 * To protect sensitive information, this function returns only
 * the first 10 characters of tokens longer than 11 characters.
 *
 * @param {string} token - The token to be safely logged
 * @returns {string} The truncated token for safe logging
 *
 * @example
 * logInfo(`Connected with token: ${logToken(userToken)}`);
 */
function logToken(token) {
  if (token.length > 11) {
    return token.slice(0, 10);
  } else {
    return token;
  }
}

/**
 * Converts a token from various formats to a standard format.
 *
 * If the token is a numeric string, converts it to an integer.
 * Otherwise attempts to convert words to numbers.
 *
 * @param {string|number} token - The token to phrase
 * @returns {number|null} The converted token as a number, or null if conversion fails
 *
 * @example
 * const tokenIndex = phraseToken("one"); // Returns 1
 * const tokenIndex = phraseToken("123"); // Returns 123
 */
function phraseToken(token) {
  if (!token) return null;

  if (!isNaN(token)) {
    return parseInt(token);
  }

  const result = wordsToNumbers(token, { fuzzy: false });
  return result !== null ? result : null;
}

/**
 * Retrieves all application configuration variables from environment.
 *
 * Gets all the environment variables used by the application and
 * provides default values for some of them when not set.
 *
 * @returns {Object} An object containing all application variables
 *
 * @example
 * const config = getVariables();
 * console.log(`Using prefix: ${config.prefix}`);
 */
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
  isServerEnabled,
  logToken,
};
