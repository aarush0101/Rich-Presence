const { logError } = require("../../src/utilities.js");
const { EmbedBuilder } = require("discord.js");
const { getPrefix } = require("../controller.js");

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
    message.reply(
      `**An error occurred while executing the command. Exception: ${e}**`
    );
  }
}

module.exports = {
  name: "help",
  alias: ["help_bot", "help-bot", "commands", "commands-bot"],
  description: "Get some help about the bot commands.",
  async execute(message, args) {
    help(message, args);
  },
};
