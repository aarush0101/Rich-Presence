/**
 * bot/commands/stop.js
 * --------------------
 *
 * This module implements the stop command which stops the bot instances.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const { erisMap, wsMap } = require("../../state.js");
const { disconnectEris, shutdown } = require("../../index.js");
const { logToken, logError, isActivityDisabled } = require("../../src/utilities.js");

/**
 * Array of user tokens extracted from environment variables.
 * Filters out empty tokens and trims whitespace.
 *
 * @type {string[]}
 */
const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter((token) => token.trim() !== "");

/**
 * Stops specified bot instances based on provided arguments.
 *
 * This function handles stopping either all bot instances or a specific instance
 * identified by its token index. It supports both Eris and WebSocket instances
 * based on the application configuration.
 *
 * @param {import('discord.js').Message} message - The Discord message object that triggered the command
 * @param {string[]} args - Command arguments, where args[0] can specify a token index or be empty to stop all
 * @returns {void}
 * @throws {Error} Logs any errors that occur during execution
 */
function stop(message, args) {
  try {
    // Check if there are any active instances to stop
    if (erisMap.size === 0 && wsMap.size === 0) {
      message.reply("**Eris/Ws instances are currently shut down. Try again later!.**");
      return;
    }

    let _idealMap;
    let mapType;

    // Determine which map type to use based on configuration
    if (isActivityDisabled()) {
      _idealMap = erisMap;
      mapType = "eris";
    } else {
      _idealMap = wsMap;
      mapType = "ws";
    }

    let token = args[0];

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

    // Process stopping instances based on token value
    if (token === -1) {
      if (mapType === "eris") {
        disconnectEris();
        message.reply(`**Eris instances for all tokens were requested to stop.**`);
      } else {
        shutdown();
        message.reply(`**Rich presence instances for all tokens were requested to stop.**`);
      }
    } else {
      if (mapType === "eris") {
        disconnectEris(token);
        message.reply(`**Eris instances stopped for token ${logToken(token)}.**`);
      } else {
        shutdown(token);
        message.reply(`**Rich Presence stopped for token ${logToken(token)}.**`);
      }
    }
  } catch (e) {
    logError(`An error occurred while stopping the instance: ${e}`);

    message.reply(
      `**An error occurred while stopping your instance. This has been logged as well. Exception: ${e}**`
    );
  }
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
  name: "stop",
  alias: ["stop-token", "stop_token"],
  description: "Stop a running token, or all.",
  async execute(message, args) {
    stop(message, args);
  },
};
