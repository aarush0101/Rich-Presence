> [!WARNING]
> THIS REPOSITORY IS ONLY FOR EDUCATIONAL PURPOSES AND IS NOT INTENDED FOR BREAKING DISCORD'S TERMS OF SERVICE. USE AT YOUR OWN RISK.

# Rich Presence

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node->=22.16.0-brightgreen.svg)

A rich presence integration for Discord, allowing you to display custom activity statuses for your Discord account.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [Docker Support](#docker-support)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- Set custom Discord Rich Presence status
- Multiple account support via token-based authentication
- Control via Discord bot commands
- Status customization (name, details, state, images, timestamps)
- Keep-alive server option
- Docker support
- Command-line interface

## Prerequisites

- [Node.js](https://nodejs.org/) (version 22.16.0 or higher)
- [npm](https://www.npmjs.com/) (included with Node.js)
- A Discord account and user token
- A Discord bot token (for command control)
- A server or always-on machine to host the application

## Installation

### Method 1: Local Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/aarush0101/Rich-Presence.git
   cd Rich-Presence
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a configuration file by copying the example:

   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your settings (see [Configuration](#configuration))

### Method 2: Docker Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/aarush0101/Rich-Presence.git
   cd Rich-Presence
   ```

2. Create and configure your `.env` file as above

3. Build and run the Docker container:
   ```bash
   docker build -t rich-presence .
   docker run -d --name rich-presence --env-file .env rich-presence
   ```

## Configuration

The application is configured via the `.env` file. Copy the `.env.example` file and modify the values as needed:

### Required Settings

| Variable      | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `START`       | Set to `true` to enable the application                              |
| `BOT_TOKEN`   | Your Discord bot token for command control                           |
| `USER_TOKENS` | Comma-separated list of Discord user tokens to set Rich Presence for |
| `PREFIX`      | Command prefix for the bot (e.g., `!`)                               |

### Rich Presence Settings

| Variable          | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| `NAME`            | Activity name (e.g., "Minecraft")                                                 |
| `DETAILS`         | First line of Rich Presence (e.g., "Playing Hypixel")                             |
| `STATE`           | Second line of Rich Presence (e.g., "In Progress")                                |
| `TYPE`            | Activity type (0: Playing, 1: Streaming, 2: Listening, 3: Watching, 5: Competing) |
| `STATUS`          | User status (online, idle, dnd, invisible)                                        |
| `LARGE_IMAGE_URL` | URL for the large image (use `mp:` prefix for media proxy URLs)                   |
| `LARGE_TEXT`      | Text shown when hovering over the large image                                     |
| `SMALL_IMAGE_URL` | URL for the small image (use `mp:` prefix for media proxy URLs)                   |
| `SMALL_TEXT`      | Text shown when hovering over the small image                                     |
| `TIMESTAMPS`      | Set to `true` to show elapsed time                                                |

### Optional Settings

| Variable       | Description                                         |
| -------------- | --------------------------------------------------- |
| `SERVER_ID`    | Specific server ID for the bot (optional)           |
| `START_SERVER` | Set to `true` to enable the keep-alive HTTP server  |
| `PORT`         | Port for the keep-alive server (default: 8080)      |
| `HOST`         | Host for the keep-alive server (default: localhost) |
| `NO_ACTIVITY`  | Set to `true` to disable Rich Presence activity     |

## Usage

### Starting the Application

Run the application using npm:

```bash
npm start
```

Or directly with Node.js:

```bash
node index.js
```

Using the provided shell script:

```bash
./start.sh
```

### Bot Commands

Once the bot is running, you can control it using commands in a Discord server where the bot is present:

| Command                    | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `!help`                    | Show available commands                                               |
| `!ping`                    | Check if the bot is responsive                                        |
| `!start`                   | Start Rich Presence for all configured tokens                         |
| `!start <index>`           | Start Rich Presence for a specific token by index                     |
| `!stop`                    | Stop Rich Presence for all tokens                                     |
| `!stop <index>`            | Stop Rich Presence for a specific token by index                      |
| `!restart`                 | Restart Rich Presence for all tokens                                  |
| `!restart <index>`         | Restart Rich Presence for a specific token by index                   |
| `!status`                  | Check the status of Rich Presence connections                         |
| `!status <index> <status>` | Change the status for a specific token (online, idle, dnd, invisible) |

## Docker Support

The application includes a Dockerfile for containerized deployment:

```bash
# Build the image
docker build -t rich-presence .

# Run the container
docker run -d --name rich-presence --env-file .env rich-presence

# View logs
docker logs rich-presence

# Stop the container
docker stop rich-presence
```

## Troubleshooting

### Common Issues

1. **Invalid Token Error**

   - Ensure your user tokens and bot token are valid and properly formatted
   - Check if the tokens have the necessary permissions

2. **Connection Errors**

   - Check your internet connection
   - Verify the Discord Gateway URL in settings.conf
   - Ensure you're not being rate-limited by Discord

3. **Bot Not Responding**

   - Verify the bot is online
   - Check if the bot has the necessary permissions
   - Ensure the prefix is correctly set in the .env file

4. **Activity Not Showing**
   - Check if `NO_ACTIVITY` is set to `false`
   - Ensure `TYPE` is not set to 4 (which is not allowed)
   - Verify your URLs are correctly formatted

### Logs

The application logs information to the console. Look for error messages that might indicate the source of problems.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](/.github/CONTRIBUTING.md) file for guidelines.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
