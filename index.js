require("dotenv").config();
const WebSocket = require("ws");
const Eris = require("eris");

const { wsMap, erisMap, statusMap, heartbeatIntervals } = require("./state.js");
const { login, destroy } = require("./bot/controller.js");
const keep_alive = require("./src/keep_alive.js");
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
} = require("./src/utilities.js");

if (!isStartEnabled()) {
  logError("No permission to start the server...");
  process.exit(1);
}

let GATEWAY_URL = assignGatewayUrl();
let shouldReconnect = false;

const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter(
  (token) => token.trim() !== ""
);

if (!userTokens.length) {
  logError("No user tokens provided.");
  process.exit(1);
}

const variables = getVariables();
if (Number(variables.type) === 4) {
  logError("Activity type of four is not allowed. Please choose any other.");
  process.exit(1);
}

function structureData(token) {
  if (!isStartEnabled) {
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

  // Check if there are any edits on the status map
  if (statusMap.size > 0) {
    // Seems like an yes
    for (const [key, value] of statusMap.entries()) {
      if (token === key) {
        data.status = value;
      }
    }
  }

  return data;
}

function updateRichPresence(token) {
  const ws = wsMap.get(token);

  if (ws && ws.readyState === WebSocket.OPEN) {
    const data = structureData(token);
    ws.send(
      JSON.stringify({
        op: 3,
        d: data,
      })
    );
    logInfo(`Rich presence updated for token: ${logToken(token)}...`);
  }
}

function setRichPresence(ws, token) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const data = structureData(token);

  ws.send(
    JSON.stringify({
      op: 3,
      d: data,
    })
  );

  logInfo(`Rich presence successfully sent for token ${logToken(token)}...`);
}

function connectUserGateway(token) {
  let ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    logInfo(`Connected to Discord Gateway for token: ${logToken(token)}...`);

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
        logDebug(`Heartbeat sent for token: ${logToken(token)}...`);
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
      logInfo(`Reconnecting in 5 seconds for token: ${logToken(token)}...`);
      setTimeout(() => connectUserGateway(token), 5000);
    } else {
      if (wsMap.has(token)) {
        wsMap.delete(token);
      }
    }
  });

  wsMap.set(token, ws);

  ws.on("error", (error) => {
    logError(`WebSocket error for token: ${logToken(token)}...`, error);
  });
}

function launchEris(token) {
  try {
    logInfo(`Launching Eris for token: ${logToken(token)}...`);
    if (token.length >= 11) {
      const erisInstance = new Eris(token);
      erisInstance.connect();
      erisInstance.on("error", (e) =>
        logError(`Eris runtime error for token: ${logToken(token)}...`, e)
      );
      erisMap.set(token, erisInstance);
      erisInstance.editStatus(variables.status, []);
    } else {
      const assignedToken = userTokens[token];
      const erisInstance = new Eris(assignedToken);
      erisInstance.connect();
      erisInstance.on("error", (e) =>
        logError(`Eris runtime error for token: ${logToken(token)}...`, e)
      );
      erisMap.set(assignedToken, erisInstance);
      erisInstance.editStatus(variables.status, []);
    }
    isActivityRunning = true;
    logInfo(`Successfully launched Eris for token: ${logToken(token)}...`);
  } catch (e) {
    logError(`Failed to launch Eris for token: ${logToken(token)}.`, e);
  }
}

function shutdown(token) {
  if (!token) {
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
    isActivityRunning = false;
  } else {
    const ws = wsMap.get(token);
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
    wsMap.delete(token);
    statusMap.delete(token);
    clearInterval(heartbeatIntervals.get(token));

    if (wsMap.size === 0) isActivityRunning = true;
  }
}

function disconnectEris(assignedToken) {
  if (!assignedToken) {
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
          `Successfully disconnected Eris for token: ${logToken(token)}...`
        );
      } catch (e) {
        logError(`Failed to disconnect Eris for token: ${logToken(token)}.`, e);
      }
    });

    erisMap.clear();
    isActivityRunning = false;
  } else {
    const erisInstance = erisMap.get(assignedToken);
    try {
      erisInstance.editStatus("offline", []);
      logInfo(
        `Clearing activity before disconnecting Eris for token: ${assignedToken}...`
      );
      erisInstance.disconnect();
      erisMap.delete(assignedToken);
      logInfo(`Successfully disconnected Eris for token: ${assignedToken}...`);
    } catch (e) {
      logError(`Failed to disconnect Eris for token: ${assignedToken}.`, e);
    }
    if (erisMap.size === 0) isActivityRunning = false;
  }
}

async function main() {
  try {
    await login();
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
