/**
 * bot/commands/ping.js
 * --------------------
 *
 * This module implements the ping command which checks the bot's latency.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const { getPing } = require("../controller.js");
const { logError } = require("../../src/utilities.js");

/**
 * Responds with the current WebSocket ping/latency of the bot.
 *
 * This function retrieves the current ping from the bot controller and
 * sends it back to the user as a formatted message. It includes error
 * handling to catch and report any issues that occur during execution.
 *
 * @param {import('discord.js').Message} message - The Discord message object that triggered the command
 * @param {string[]} args - Command arguments (not used in this command)
 * @returns {void}
 * @throws {Error} Logs any errors that occur during execution
 */
function ping(message, args) {
  try {
    let pingExec = getPing();
    message.reply(`**🏓 Pong! In ${pingExec} ms.**`);
  } catch (e) {
    logError(`An error occurred while executing the ping command: ${e}`);
    message.reply(`**An error occurred while executing the ping command. Exception: ${e}**`);
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
  name: "ping",
  alias: ["ping-bot", "ping_bot", "latency", "latency-bot", "latency_bot"],
  description: "Ping the bot and get the latency.",
  async execute(message, args) {
    ping(message, args);
  },
};
