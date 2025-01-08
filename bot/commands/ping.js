const { getPing } = require("../controller.js");
const { logError } = require("../../src/utilities.js");

function ping(message, args) {
  try {
    pingExec = getPing();
    message.reply(`**🏓 Pong! In ${pingExec} ms.**`);
  } catch (e) {
    logError(`An error occurred while executing the ping command: ${e}`);
    message.reply(
      `**An error occurred while executing the ping command. Exception: ${e}**`
    );
  }
}

module.exports = {
  name: "ping",
  alias: ["ping-bot", "ping_bot", "latency", "latency-bot", "latency_bot"],
  description: "Ping the bot and get the latency.",
  async execute(message, args) {
    ping(message, args);
  },
};
