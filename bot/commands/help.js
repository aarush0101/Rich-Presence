/**
 * bot/commands/help.js
 * --------------------
 *
 * This module implements the help command which displays information about all available
 * bot commands to the user in an embedded message format.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const { logError } = require("../../src/utilities.js");
const { EmbedBuilder } = require("discord.js");
const { getPrefix } = require("../controller.js");

/**
 * Creates and sends an embedded help message with a list of all available commands.
 *
 * The embed includes:
 * - Current bot prefix
 * - List of commands with descriptions
 * - Timestamp of when the help was requested
 *
 * @param {import('discord.js').Message} message - The Discord message object that triggered the command
 * @param {string[]} args - Command arguments (not used in this command)
 * @returns {void}
 * @throws {Error} Logs any errors that occur during execution
 */
function help(message, args) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x009b77)
      .setTitle("Automatic Keep-Alive Bot")
      .setDescription(
        `**🤖 Here are the available commands you can use:**\n**🟦 Current prefix of the bot is: ${getPrefix()}**`
      )
      .addFields(
        {
          name: "help",
          value: "Get help about the bot commands.",
          inline: true,
        },
        { name: "ping", value: "Check the bot's latency.", inline: false },
        {
          name: "start",
          value: "Start the keep alive mechanism.",
          inline: false,
        },
        {
          name: "stop",
          value: "Stop the keep alive mechanism.",
          inline: false,
        },
        {
          name: "restart",
          value: "Restart the keep alive mechanism.",
          inline: false,
        },
        {
          name: "status",
          value: "Change the status of the keep alive tokens.",
          inline: false,
        }
      )
      .setFooter({ text: "Use commands wisely!" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (e) {
    logError(`An error occurred while executing the help command: ${e}`);
    message.reply(`**An error occurred while executing the command. Exception: ${e}**`);
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
  name: "help",
  alias: ["help_bot", "help-bot", "commands", "commands-bot"],
  description: "Get some help about the bot commands.",
  async execute(message, args) {
    help(message, args);
  },
};
