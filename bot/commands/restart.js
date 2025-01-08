const { erisMap, wsMap } = require("../../state.js");
const { startEris, startWs } = require("./start.js");
const { disconnectEris, shutdown } = require("../../index.js");

const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter(
  (token) => token.trim() !== ""
);

function restart(message, args) {
  try {
    if (erisMap.size === 0 && wsMap.size === 0) {
      message.reply(
        "**Eris/Ws instances are currently shut down. Try again later!.**"
      );
      return;
    }

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
        disconnectEris();
        startEris();
        message.reply(
          `**Eris instances for all tokens were requested to stop and start again.**`
        );
      } else {
        shutdown();
        startWs();
        message.reply(
          `**Rich presence instances for all tokens were requested to stop and start again.**`
        );
      }
    } else {
      if (mapType === "eris") {
        disconnectEris(token);
        startEris(token);
        message.reply(
          `**Eris instances stopped for token token and asked to start again.**`
        );
      } else {
        shutdown(token);
        startWs(token);
        message.reply(
          `**Rich Presence stopped for token token and asked to start again.**`
        );
      }
    }
  } catch (e) {
    logError(`An error occurred while stopping the instance: ${e}`);

    message.reply(
      `**An error occurred while changing the status. This has been logged as well. Exception: ${e}**`
    );
  }
}

module.exports = {
  name: "restart",
  alias: ["restart-token", "restart_token"],
  description: "Restart a running token, or all.",
  async execute(message, args) {
    restart(message, args);
  },
};
