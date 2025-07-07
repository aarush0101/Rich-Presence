/**
 * bot/commands/start.js
 * ---------------------
 *
 * This module implements the start command which starts the bot instances.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const { erisMap, wsMap } = require("../../state.js");

let { launchEris, connectUserGateway } = require("../../index.js");
const { logError, logToken, isActivityDisabled } = require("../../src/utilities.js");

/**
 * Array of user tokens extracted from environment variables.
 * Filters out empty tokens and trims whitespace.
 *
 * @type {string[]}
 */
const userTokens = process.env.USER_TOKENS.split(/\s*,\s*/).filter((token) => token.trim() !== "");

/**
 * Starts bot instances based on provided arguments.
 *
 * This function handles starting either all bot instances or a specific instance
 * identified by its token index. It supports both Eris and WebSocket instances
 * based on the application configuration.
 *
 * @param {import('discord.js').Message} message - The Discord message object that triggered the command
 * @param {string[]} args - Command arguments, where args[0] can specify a token index or be empty to start all
 * @returns {void}
 * @throws {Error} Logs any errors that occur during execution
 */
function start(message, args) {
  try {
    let idealMap;
    let mapType;

    // Determine which map type to use based on configuration
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

    // Validate token index
    if ((token < 0 && token !== -1) || token >= userTokens.length) {
      message.reply(
        `**Invalid token number. Please provide a valid token number. You only have ${userTokens.length} tokens available in your instance.**`
      );
      return;
    }

    // Process starting instances based on token value
    if (token === -1) {
      if (mapType === "eris") {
        startEris();
        message.reply(`**Eris instances for all tokens were requested to start.**`);
      } else {
        startWs();
        message.reply(`**Rich presence instances for all tokens were requested to start.**`);
      }
    } else {
      if (mapType === "eris") {
        startEris(token);
        message.reply(`**Eris instances started for token ${logToken(token)}.**`);
      } else {
        startWs(token);
        message.reply(`**Rich Presence started for token ${logToken(token)}.**`);
      }
    }
  } catch (e) {
    logError(`An error occurred while starting an instance: ${e}`);

    message.reply(
      `**An error occurred while starting your instance. This has been logged as well. Exception: ${e}**`
    );
  }
}

/**
 * Starts Eris client instances for specified tokens.
 *
 * If no token is specified, starts instances for all tokens from environment.
 * Otherwise, starts an instance for the specific token index.
 *
 * @param {number} [token] - Optional token index to start, or -1/undefined for all tokens
 * @returns {void}
 */
const startEris = (token) => {
  if (token === -1 || !token) {
    userTokens.forEach((assignedToken) => {
      launchEris(assignedToken);
    });
  } else {
    launchEris(token);
  }
};

/**
 * Starts WebSocket connections for specified tokens.
 *
 * If no token is specified, starts connections for all tokens from environment.
 * Otherwise, starts a connection for the specific token index.
 *
 * @param {number} [token] - Optional token index to start, or -1/undefined for all tokens
 * @returns {void}
 */
const startWs = (token) => {
  if (token === -1 || !token) {
    userTokens.forEach((assignedToken) => {
      connectUserGateway(assignedToken);
    });
  } else {
    connectUserGateway(token);
  }
};

/**
 * Command export configuration object.
 * This object conforms to the command structure expected by the bot controller.
 *
 * @type {Object}
 * @property {string} name - Primary command name
 * @property {string[]} alias - Alternative names/aliases for the command
 * @property {string} description - Brief description of what the command does
 * @property {Function} execute - The function that executes when command is invoked
 * @property {Function} startEris - Helper function to start Eris instances
 * @property {Function} startWs - Helper function to start WebSocket connections
 */
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
