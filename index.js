/**
 * index.js
 * --------
 *
 * Main entrypoint for the Rich Presence application.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

require("dotenv").config();
const WebSocket = require("ws");
const Eris = require("eris");

const { wsMap, erisMap, statusMap, heartbeatIntervals } = require("./state.js");
const { login, destroy } = require("./bot/controller.js");
const { keep_alive } = require("./src/keep_alive.js");
const {
  logInfo,
  logError,
  validateEnvVariables,
  isStartEnabled,
  isTrue,
  logDebug,
  assignGatewayUrl,
  getVariables,
  logToken,
  isServerEnabled,
  isActivityDisabled,
} = require("./src/utilities.js");

if (!isStartEnabled()) {
  logError("No permission to start the server...");
  process.exit(1);
}

const GATEWAY_URL = assignGatewayUrl();
let shouldReconnect = false;

const userTokens = process.env.USER_TOKENS
  ? process.env.USER_TOKENS.split(/\s*,\s*/).filter(Boolean)
  : [];

if (!userTokens.length) {
  logError("No user tokens provided.");
  process.exit(1);
}

const variables = getVariables();
if (!isActivityDisabled() && Number(variables.type) === 4) {
  logError("Activity type of four is not allowed. Please choose any other.");
  process.exit(1);
}

/**
 * Creates a structured data object for Discord rich presence.
 *
 * This function builds the Discord presence payload with activity information
 * including name, type, details, state, and assets. It validates permissions
 * and token before constructing the data.
 *
 * @param {string} token - The Discord user authentication token
 * @returns {Object} The structured data object for Discord rich presence
 * @throws {Error} Will exit process if permissions aren't granted or token is missing
 *
 * @example
 * const data = structureData('USER_TOKEN');
 */
function structureData(token) {
  if (!isStartEnabled()) {
    logError("No permissions to start the server...");
    process.exit(1);
  }
  if (!token) {
    logError("No token was provided...");
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
      ...(isTrue("TIMESTAMPS") && { timestamps: { start: Date.now() } }),
    },
  ];

  let status = variables.status;
  if (statusMap.has(token)) status = statusMap.get(token);

  return {
    since: Date.now(),
    status,
    afk: false,
    activities,
  };
}

/**
 * Sends rich presence data through the WebSocket connection.
 *
 * This function sends a rich presence update (opcode 3) to Discord
 * through the provided WebSocket connection. It only sends if the
 * WebSocket connection is open.
 *
 * @param {WebSocket} ws - The WebSocket connection to Discord Gateway
 * @param {string} token - The Discord user authentication token
 * @param {Object|null} msgData - Optional custom presence data to send, otherwise generated from structureData
 * @returns {void}
 *
 * @example
 * sendRichPresence(wsConnection, 'USER_TOKEN');
 * sendRichPresence(wsConnection, 'USER_TOKEN', customData);
 */
function sendRichPresence(ws, token, msgData = null) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const data = msgData || structureData(token);
  ws.send(JSON.stringify({ op: 3, d: data }));
}

/**
 * Updates rich presence for a specified token.
 *
 * This function retrieves the WebSocket connection for the specified token
 * and sends an updated rich presence if the connection is open.
 *
 * @param {string} token - The Discord user authentication token
 * @returns {void}
 *
 * @example
 * updateRichPresence('USER_TOKEN');
 */
function updateRichPresence(token) {
  const ws = wsMap.get(token);
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendRichPresence(ws, token);
    logInfo(`Rich presence updated for token: ${logToken(token)}...`);
  }
}

/**
 * Sets and logs rich presence for a token.
 *
 * This function sends the rich presence data and logs the successful operation.
 * Used primarily after connecting to the Discord Gateway.
 *
 * @param {WebSocket} ws - The WebSocket connection to Discord Gateway
 * @param {string} token - The Discord user authentication token
 * @returns {void}
 *
 * @example
 * setRichPresence(wsConnection, 'USER_TOKEN');
 */
function setRichPresence(ws, token) {
  sendRichPresence(ws, token);
  logInfo(`Rich presence successfully sent for token ${logToken(token)}...`);
}

/**
 * Establishes a WebSocket connection to the Discord Gateway for a user token.
 *
 * This function connects to Discord's Gateway, authenticates with the provided token,
 * sets up heartbeat intervals to maintain the connection, and handles various WebSocket events.
 *
 * @param {string} token - The Discord user authentication token
 * @returns {void}
 *
 * @listens WebSocket#open - Sends the identify payload when connection is established
 * @listens WebSocket#message - Handles incoming gateway events, particularly the HELLO event (op 10)
 * @listens WebSocket#close - Handles disconnection, implementing reconnect logic for appropriate close codes
 * @listens WebSocket#error - Logs WebSocket errors
 *
 * @throws {Error} May throw errors from WebSocket operations
 *
 * @example
 * connectUserGateway('USER_TOKEN');
 */
function connectUserGateway(token) {
  const ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    logInfo(`Connected to Discord Gateway for token: ${logToken(token)}...`);
    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token,
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
      if (heartbeatIntervals.has(token)) clearInterval(heartbeatIntervals.get(token));
      const interval = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
        logDebug(`Heartbeat sent for token: ${logToken(token)}...`);
      }, heartbeatIntervalMs);
      heartbeatIntervals.set(token, interval);
      setTimeout(() => setRichPresence(ws, token), 1000);
    }
  });

  ws.on("close", (code, reason) => {
    logError(
      `Disconnected from Discord Gateway for token: ${token.slice(0, 10)}. Code: ${code}, Reason: ${reason || "No reason provided"}`
    );
    if (heartbeatIntervals.has(token)) clearInterval(heartbeatIntervals.get(token));
    if (shouldReconnect && ![4004, 4010, 4011].includes(code)) {
      logInfo(`Reconnecting in 5 seconds for token: ${logToken(token)}...`);
      setTimeout(() => connectUserGateway(token), 5000);
    } else {
      wsMap.delete(token);
    }
  });

  ws.on("error", (error) => {
    logError(`WebSocket error for token: ${logToken(token)}...`, error);
  });

  wsMap.set(token, ws);
}

/**
 * Initializes an Eris client with the specified token.
 *
 * This function creates an Eris client instance, connects to Discord,
 * sets up error handling, and sets the initial status. It stores the
 * instance in the erisMap for later reference.
 *
 * @param {string|number} token - The Discord user authentication token or index in userTokens array
 * @returns {void}
 * @throws {Error} Logs any errors that occur during initialization
 *
 * @example
 * launchEris('USER_TOKEN');
 * launchEris(0); // Use first token in userTokens array
 */
function launchEris(token) {
  try {
    logInfo(`Launching Eris for token: ${logToken(token)}...`);
    const assignedToken = token.length >= 11 ? token : userTokens[token];
    const erisInstance = new Eris(assignedToken);
    erisInstance.connect();
    erisInstance.on("error", (e) =>
      logError(`Eris runtime error for token: ${logToken(token)}...`, e)
    );
    erisMap.set(assignedToken, erisInstance);
    erisInstance.editStatus(variables.status, []);
    isActivityRunning = true;
    logInfo(`Successfully launched Eris for token: ${logToken(token)}...`);
  } catch (e) {
    logError(`Failed to launch Eris for token: ${logToken(token)}.`, e);
  }
}

/**
 * Clears activity status and sets user as offline before closing connection.
 *
 * This function sends two presence updates to clear activity and set status to offline,
 * then disables reconnection and closes the WebSocket connection.
 *
 * @param {WebSocket} ws - The WebSocket connection to Discord Gateway
 * @param {string} token - The Discord user authentication token
 * @returns {void}
 *
 * @example
 * clearActivityAndSendOffline(wsConnection, 'USER_TOKEN');
 */
function clearActivityAndSendOffline(ws, token) {
  sendRichPresence(ws, token, {
    activities: [],
    since: null,
    status: "offline",
    afk: false,
  });
  sendRichPresence(ws, token, { status: "offline" });
  shouldReconnect = false;
  logDebug(`Activity cleared before shutting down WebSocket for token: ${token.slice(0, 10)}...`);
  ws.close();
}

/**
 * Shuts down WebSocket connections and clears activities.
 *
 * If a token is provided, it only shuts down the connection for that token.
 * Otherwise, it shuts down all active connections and clears all resources.
 *
 * @param {string} [token] - Optional Discord user token to shut down
 * @returns {void}
 *
 * @example
 * shutdown(); // Shutdown all connections
 * shutdown('USER_TOKEN'); // Shutdown specific connection
 */
function shutdown(token) {
  if (!token) {
    wsMap.forEach((ws, tkn) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        clearActivityAndSendOffline(ws, tkn);
      }
    });
    wsMap.clear();
    heartbeatIntervals.forEach(clearInterval);
    heartbeatIntervals.clear();
    isActivityRunning = false;
  } else {
    const ws = wsMap.get(token);
    if (ws && ws.readyState === WebSocket.OPEN) {
      clearActivityAndSendOffline(ws, token);
    }
    wsMap.delete(token);
    statusMap.delete(token);
    clearInterval(heartbeatIntervals.get(token));
    if (wsMap.size === 0) isActivityRunning = false;
  }
}

/**
 * Disconnects Eris client instances.
 *
 * If a token is provided, it disconnects only that specific instance.
 * Otherwise, it disconnects all Eris instances and clears the map.
 *
 * @param {string} [assignedToken] - Optional token to disconnect
 * @returns {void}
 *
 * @example
 * disconnectEris(); // Disconnect all instances
 * disconnectEris('USER_TOKEN'); // Disconnect specific instance
 */
function disconnectEris(assignedToken) {
  /**
   * Helper function to disconnect a single Eris instance.
   *
   * @param {Eris} erisInstance - The Eris client instance
   * @param {string} token - The token associated with the instance
   * @returns {void}
   * @private
   */
  function disconnectInstance(erisInstance, token) {
    try {
      erisInstance.editStatus("offline", []);
      logInfo(`Clearing activity before disconnecting Eris for token: ${token.slice(0, 10)}...`);
      erisInstance.disconnect();
      logInfo(`Successfully disconnected Eris for token: ${logToken(token)}...`);
    } catch (e) {
      logError(`Failed to disconnect Eris for token: ${logToken(token)}.`, e);
    }
  }

  if (!assignedToken) {
    erisMap.forEach(disconnectInstance);
    erisMap.clear();
    isActivityRunning = false;
  } else {
    const erisInstance = erisMap.get(assignedToken);
    if (erisInstance) {
      disconnectInstance(erisInstance, assignedToken);
      erisMap.delete(assignedToken);
    }
    if (erisMap.size === 0) isActivityRunning = false;
  }
}

/**
 * Main application entry point.
 *
 * Initializes the application by logging in the bot controller,
 * validating environment variables, and setting up a SIGINT handler
 * for graceful shutdown.
 *
 * @returns {Promise<void>}
 * @throws {Error} Logs and exits if fatal errors occur during startup
 */
async function main() {
  try {
    if (isServerEnabled()) {
      logInfo("Starting server...");
      keep_alive();
    }
    await login();
    validateEnvVariables();

    process.on("SIGINT", () => {
      logInfo("Shutting down...");
      shutdown();
      disconnectEris();
      destroy();
      process.exit(0);
    });
  } catch (error) {
    logError("Fatal error during bot startup:", error);
    process.exit(1);
  }
}

main();

module.exports = {
  disconnectEris,
  updateRichPresence,
  shutdown,
  launchEris,
  connectUserGateway,
};
