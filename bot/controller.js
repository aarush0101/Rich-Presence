const { Client, GatewayIntentBits, Collection } = require("discord.js");
const {
  logInfo,
  logError,
  logDebug,
  getVariables,
} = require("../src/utilities.js");
const fs = require("fs");
const path = require("path");

const bot = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
  ],
});

const variables = getVariables();
bot.commands = new Collection();

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

async function verifyChannels() {
  try {
    const guild = await bot.guilds.fetch(variables.serverId);

    const channels = guild.channels.cache.filter((channel) =>
      channel.isTextBased()
    );

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

const getPing = () => {
  if (!bot.isReady()) return 0;
  return Math.round(bot.ws.ping);
};

const getPrefix = () => {
  return variables.prefix;
};

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
