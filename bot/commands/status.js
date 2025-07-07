/**
 * bot/commands/status.js
 * ---------------------
 *
 * This module implements the status command which checks the bot's status.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const { logError } = require("../../src/utilities.js");
const { erisMap, wsMap, statusMap } = require("../../state.js");
const { logDebug, logToken, verifyStatus } = require("../../src/utilities.js");
const { updateRichPresence } = require("../../index.js");

/**
 * Array of user tokens extracted from environment variables.
 * Filters out empty tokens and trims whitespace.
 *
 * @type {string[]}
 */
const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter((token) => token.trim() !== "");

/**
 * Changes the status of specified Discord user tokens.
 *
 * This function handles changing the status (online, idle, dnd, invisible) for either
 * all user tokens or a specific token. It supports both Eris clients and WebSocket
 * connections based on what's currently active.
 *
 * @param {import('discord.js').Message} message - The Discord message object that triggered the command
 * @param {string[]} args - Command arguments, where args[0] is the status and args[1] is optional token index
 * @returns {void}
 * @throws {Error} Logs any errors that occur during execution
 */
function status(message, args) {
  try {
    // Check if there are any active instances to modify status
    if (erisMap.size === 0 && wsMap.size === 0) {
      message.reply("**Eris/Ws instances are currently off. Try again later!**");
      return;
    }

    let idealMap;
    let mapType;

    // Determine which map type to use based on what's available
    if (wsMap.size === 0 || !wsMap) {
      idealMap = erisMap;
      mapType = "eris";
    } else {
      idealMap = wsMap;
      mapType = "ws";
    }

    // Show usage if no arguments provided
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

    // Validate token index
    if ((token < 0 && token !== -1) || token >= userTokens.length) {
      message.reply(
        `**Invalid token number. Please provide a valid token number. You only have ${userTokens.length} tokens available in your instance.**`
      );
      return;
    }

    // Verify status is valid
    let [verified, refined] = verifyStatus(status);

    if (!verified) {
      message.reply(
        "**Invalid status. Status should be one of the following: ``online``, ``dnd``, ``idle``, or ``invisible``.**"
      );
      return;
    }

    // Handle WebSocket vs Eris status updates
    if (mapType === "ws") return editWsStatus(message, idealMap, token, refined);

    if (token === -1) {
      // Update all Eris instances
      idealMap.forEach((instance, assignedToken) => {
        instance.editStatus(refined, []);
        logDebug(`Status set to ${refined} for token: ${assignedToken}...`);
      });
      message.reply(
        `**Status set to ${refined} for all tokens in your config.  Remember, this change will only last for the current session. To permanently change your status, change the environmental configurations.**`
      );
      return;
    } else {
      // Update specific Eris instance
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

/**
 * Updates status for WebSocket-based rich presence connections.
 *
 * This function updates the status in the statusMap and triggers a rich presence
 * update for either all tokens or a specific token.
 *
 * @param {import('discord.js').Message} message - The Discord message object for response
 * @param {Map<string, WebSocket>} idealMap - Map of token to WebSocket connections
 * @param {number|string} token - Token index (-1 for all) or specific token index
 * @param {string} refined - Verified status string to set
 * @returns {void}
 */
function editWsStatus(message, idealMap, token, refined) {
  if (token === -1) {
    idealMap.forEach((instance, assignedToken) => {
      editMapStatus(refined, assignedToken);
      updateRichPresence(assignedToken);
      logDebug(
        `Rich presence status set to ${refined} for token: ${assignedToken.slice(0, 10)}...`
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
    logDebug(`Rich presence status set to ${refined} for token: ${logToken(token)}...`);

    message.reply(
      `**Status set to ${refined} for token ${logToken(
        token
      )}. Remember, this change will only last for the current session. To permanently change your status, change the environmental configurations.**`
    );
  }
}

/**
 * Updates the status for a specific token in the statusMap.
 *
 * This helper function manages the statusMap, removing any existing
 * entry for the token and setting the new status.
 *
 * @param {string} refined - The validated status string to set
 * @param {string} assignedToken - The user token to update status for
 * @returns {void}
 */
function editMapStatus(refined, assignedToken) {
  if (statusMap.has(assignedToken)) {
    statusMap.delete(assignedToken);
  }
  statusMap.set(assignedToken, refined);
}

/**
 * Command export configuration object.
 * This object conforms to the command structure expected by the bot controller.
 *
 * @type {Object}
 * @property {string} name - Primary command name
 * @property {string[]} alias - Alternative names/aliases for the command
 * @property {string} description - Brief description of what the command does
 * @property {Function} execute - The function that executes when command is invoked
 */
module.exports = {
  name: "status",
  alias: ["status", "edit-status", "edit_status", "editstatus"],
  description: "Change the status of Eris tokens. Only valid for the current session.",
  async execute(message, args) {
    status(message, args);
  },
};
