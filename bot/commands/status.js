const { logError } = require("../../src/utilities.js");
const { erisMap, wsMap, statusMap } = require("../../state.js");
const { logDebug, logToken, verifyStatus } = require("../../src/utilities.js");
const { updateRichPresence } = require("../../index.js");

const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter(
  (token) => token.trim() !== ""
);

function status(message, args) {
  try {
    if (erisMap.size === 0 && wsMap.size === 0) {
      message.reply(
        "**Eris/Ws instances are currently off. Try again later! By the way, you cannot change the status of a rich presence.**"
      );
      return;
    }

    let idealMap;
    let mapType;

    if (wsMap.size === 0 || !wsMap) {
      idealMap = erisMap;
      mapType = "eris";
    } else {
      idealMap = wsMap;
      mapType = "ws";
    }

    if (args.length === 0) {
      message.reply(
        "**Usage: `status <status> [token]`**\n**-> Status can be any of: ``online``, ``dnd``, ``idle``, or ``invisible``.**\n\n**-> You  may not may not specify a token number. This is only used when you have multiple tokens and only want to change status of one. Specify the token number, for example, you want to change the status of token 3, then you would specify `status online 3`.**"
      );
      return;
    }

    let status = args[0].toLowerCase();
    let token = args[1];

    // Default to -1 (all tokens) if no token is provided
    if (!token || token === "") token = -1;

    if (token !== -1) token = parseInt(token) - 1; // Subtract 1 for zero-indexing

    if ((token < 0 && token !== -1) || token >= userTokens.length) {
      message.reply(
        `**Invalid token number. Please provide a valid token number. You only have ${userTokens.length} tokens available in your instance.**`
      );
      return;
    }
    let [verified, refined] = verifyStatus(status);

    if (!verified) {
      message.reply(
        "**Invalid status. Status should be one of the following: ``online``, ``dnd``, ``idle``, or ``invisible``.**"
      );
      return;
    }

    if (mapType === "ws")
      return editWsStatus(message, idealMap, token, refined);

    if (token === -1) {
      idealMap.forEach((instance, assignedToken) => {
        instance.editStatus(refined, []);
        logDebug(`Status set to ${refined} for token: ${assignedToken}...`);
      });
      message.reply(
        `**Status set to ${refined} for all tokens in your config.  Remember, this change will only last for the current session. To permanently change your status, change the environmental configurations.**`
      );
      return;
    } else {
      const idealMapValues = Array.from(idealMap.values());
      let instance = idealMapValues[token];
      instance.editStatus(refined, []);
      logDebug(`Status set to ${refined} for token: ${logToken(token)}...`);

      message.reply(
        `**Status set to ${refined} for token ${logToken(
          token
        )}. Remember, this change will only last for the current session. To permanently change your status, change the environmental configurations.**`
      );
      return;
    }
  } catch (e) {
    logError(`An error occurred while changing the status: ${e}`);
    message.reply(
      `**An error occurred while changing the status. This has been logged as well. Exception: ${e}**`
    );

    return;
  }
}

function editWsStatus(message, idealMap, token, refined) {
  if (token === -1) {
    idealMap.forEach((instance, assignedToken) => {
      editMapStatus(refined, assignedToken);
      updateRichPresence(assignedToken);
      logDebug(
        `Rich presence status set to ${refined} for token: ${assignedToken.slice(
          0,
          10
        )}...`
      );
    });

    message.reply(
      `**Status set to ${refined} for all tokens in your config. Remember, this change will only last for the current session. To permanently change your status, change the environmental configurations.**`
    );
  } else {
    const idealMapEntries = Array.from(idealMap.entries());
    const [assignedToken, instance] = idealMapEntries[token];
    editMapStatus(refined, assignedToken);
    updateRichPresence(assignedToken);
    logDebug(
      `Rich presence status set to ${refined} for token: ${logToken(token)}...`
    );

    message.reply(
      `**Status set to ${refined} for token ${logToken(
        token
      )}. Remember, this change will only last for the current session. To permanently change your status, change the environmental configurations.**`
    );
  }
}

function editMapStatus(refined, assignedToken) {
  if (statusMap.has(assignedToken)) {
    statusMap.delete(assignedToken);
  }
  statusMap.set(assignedToken, refined);
}

module.exports = {
  name: "status",
  alias: ["status", "edit-status", "edit_status", "editstatus"],
  description:
    "Change the status of Eris tokens. Only valid for the current session.",
  async execute(message, args) {
    status(message, args);
  },
};
