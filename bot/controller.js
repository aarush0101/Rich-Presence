/**
 * bot/controller.js
 * -----------------
 *
 * Implements various command handlers for the Discord bot.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { logInfo, logError, logDebug, getVariables } = require("../src/utilities.js");
const fs = require("fs");
const path = require("path");

/**
 * Discord client instance with specified gateway intents.
 * The intents are limited to only what's needed for message handling and guild information.
 *
 * @type {import('discord.js').Client}
 */
const bot = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
  ],
});

/**
 * Application configuration variables loaded from environment.
 * @type {Object}
 */
const variables = getVariables();

/**
 * Collection to store all bot commands.
 * @type {import('discord.js').Collection<string, Object>}
 */
bot.commands = new Collection();

/**
 * Dynamically loads all command files from the commands directory.
 * Each command file should export an object with at minimum a 'name' and 'execute' property.
 *
 * @function
 * @returns {void}
 */
const loadCommands = () => {
  const commandFiles = fs
    .readdirSync(path.join(__dirname, "./commands"))
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
    logDebug(`Loaded ${command.name}.`);
  }
};

/**
 * Event handler for message creation.
 * Processes incoming messages to identify and execute commands.
 * Ignores messages from bots, messages from servers other than the configured one,
 * and messages that don't start with the command prefix.
 *
 * @listens messageCreate
 */
bot.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Custom `before_invoke` logic
  if (message.guild.id !== variables.serverId) {
    return; // Ignore messages not from the specified server
  }

  if (!message.content || !message.content.startsWith(variables.prefix)) return;

  const args = message.content.slice(variables.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = bot.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (e) {
    logError(`Error executing command: ${commandName}: ${e}`);
    message.reply(
      `**There was an error executing that command! Exception at \`messageCreate\`: controller.js line 48: ${e}**`
    );
  }
});

/**
 * Verifies that the bot has permission to send messages in at least one channel.
 *
 * This function checks all text channels in the configured server to ensure
 * the bot has proper permissions to function. Without message permissions,
 * the bot wouldn't be able to respond to commands.
 *
 * @async
 * @function
 * @returns {Promise<boolean>} True if the bot can send messages in at least one channel, false otherwise
 * @throws {Error} Logs any errors that occur during verification
 */
async function verifyChannels() {
  try {
    const guild = await bot.guilds.fetch(variables.serverId);

    const channels = guild.channels.cache.filter((channel) => channel.isTextBased());

    for (const [id, channel] of channels) {
      const botMember = await guild.members.fetch(bot.user.id);
      const permissions = channel.permissionsFor(botMember);

      if (permissions && permissions.has("SendMessages")) {
        return true;
      }
    }

    // No accessible channel found
    return false;
  } catch (e) {
    logError(`Error verifying channels: ${e}`);
    return false;
  }
}

/**
 * Event handler triggered when the bot is ready and connected to Discord.
 * Sets the bot's presence to invisible, loads commands, and verifies channel permissions.
 *
 * @listens ready
 */
bot.once("ready", async () => {
  bot.user.setPresence({ status: "invisible" });
  logInfo("Bot is online and set to invisible.");
  loadCommands();
  logInfo("Commands successfully loaded.");
  const verified = await verifyChannels();
  if (!verified) {
    logError(
      "No accessible text channels found in the server you've provided. Please make sure that the bot can at least message in of the channels of the server."
    );
    process.exit(1);
  }
});

/**
 * Logs in the bot using the token from environment variables.
 *
 * @async
 * @function
 * @returns {Promise<void>}
 * @throws {Error} Exits the process if login fails or no token is provided
 */
const login = async () => {
  if (!variables.botToken) {
    logError("No bot token provided.");
    process.exit(1);
  }

  try {
    await bot.login(variables.botToken);
    logInfo("Bot logged in successfully.");
  } catch (error) {
    logError("Failed to log in for the bot account:", error);
    process.exit(1);
  }
};

/**
 * Returns the current WebSocket ping of the bot.
 *
 * @function
 * @returns {number} The bot's WebSocket ping in milliseconds, or 0 if the bot isn't ready
 */
const getPing = () => {
  if (!bot.isReady()) return 0;
  return Math.round(bot.ws.ping);
};

/**
 * Returns the command prefix used by the bot.
 *
 * @function
 * @returns {string} The command prefix
 */
const getPrefix = () => {
  return variables.prefix;
};

/**
 * Destroys the bot instance, properly terminating the connection to Discord.
 *
 * @function
 * @returns {void}
 */
const destroy = () => {
  logInfo("Destroying bot instance...");
  bot.destroy();
};

module.exports = {
  login,
  destroy,
  loadCommands,
  verifyChannels,
  getPing,
  getPrefix,
};
