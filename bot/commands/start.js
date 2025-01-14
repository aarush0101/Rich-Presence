const { erisMap, wsMap } = require("../../state.js");

let { launchEris, connectUserGateway } = require("../../index.js");
const {
  logError,
  logToken,
  isActivityDisabled,
} = require("../../src/utilities.js");

const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter(
  (token) => token.trim() !== ""
);

function start(message, args) {
  try {
    let idealMap;
    let mapType;

    if (isActivityDisabled()) {
      idealMap = erisMap;
      mapType = "eris";
    } else {
      idealMap = wsMap;
      mapType = "ws";
    }

    let token = args[0];

    // Default to -1 (all tokens) if no token is provided
    if (!token || token === "") token = -1;

    if (token !== -1) token = parseInt(token) - 1; // Subtract 1 for zero-indexing

    if ((token < 0 && token !== -1) || token >= userTokens.length) {
      message.reply(
        `**Invalid token number. Please provide a valid token number. You only have ${userTokens.length} tokens available in your instance.**`
      );
      return;
    }

    if (token === -1) {
      if (mapType === "eris") {
        startEris();
        message.reply(
          `**Eris instances for all tokens were requested to start.**`
        );
      } else {
        startWs();
        message.reply(
          `**Rich presence instances for all tokens were requested to start.**`
        );
      }
    } else {
      if (mapType === "eris") {
        startEris(token);
        message.reply(
          `**Eris instances started for token ${logToken(token)}.**`
        );
      } else {
        startWs(token);
        message.reply(
          `**Rich Presence started for token ${logToken(token)}.**`
        );
      }
    }
  } catch (e) {
    logError(`An error occurred while starting an instance: ${e}`);

    message.reply(
      `**An error occurred while starting your instance. This has been logged as well. Exception: ${e}**`
    );
  }
}

const startEris = (token) => {
  if (token === -1 || !token) {
    userTokens.forEach((assignedToken) => {
      launchEris(assignedToken);
    });
  } else {
    launchEris(token);
  }
};

const startWs = (token) => {
  if (token === -1 || !token) {
    userTokens.forEach((assignedToken) => {
      connectUserGateway(assignedToken);
    });
  } else {
    connectUserGateway(token);
  }
};

module.exports = {
  name: "start",
  alias: ["start-token", "start_token"],
  description: "Start a running token, or all.",
  async execute(message, args) {
    start(message, args);
  },
  startEris,
  startWs,
};
