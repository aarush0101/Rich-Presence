/**
 * src/keep_alive.js
 * -----------------
 *
 * Implements a keep-alive HTTP server to prevent the application from sleeping.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

const http = require("http");
const { logDebug, logInfo, logError } = require("./utilities");

/**
 * The port number on which the server will listen.
 * Uses the PORT environment variable if available, otherwise defaults to 8080.
 * @constant {number}
 */
const PORT = process.env.PORT || 8080;

/**
 * The hostname on which the server will listen.
 * Uses the HOST environment variable if available, otherwise defaults to "localhost".
 * @constant {string}
 */
const HOST = process.env.HOST || "localhost";

/**
 * The timestamp when the server was started, used for uptime calculations.
 * @constant {number}
 */
const startTime = Date.now();

/**
 * Calculates the total uptime of the server till now.
 *
 * Computes the difference between current time and server start time,
 * then formats it into a human-readable string with hours, minutes, seconds, and milliseconds.
 *
 * @returns {string} The formatted uptime string in the format "Xh Ym Zs Wms"
 */
function formatUptime() {
  const uptime = Date.now() - startTime;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
  const milliseconds = uptime % 1000;

  return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
}

/**
 * Extracts the client's IP address from the request.
 *
 * First tries to get the IP from the 'x-forwarded-for' header (used when behind proxies),
 * then falls back to the socket's remote address if the header isn't available.
 *
 * @param {http.IncomingMessage} req - The HTTP request object
 * @returns {string} The client's IP address
 */
function getClientIp(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

/**
 * Creates and starts an HTTP server with various endpoints.
 *
 * This function initializes the HTTP server that responds to different routes:
 * - '/' - Basic connection confirmation
 * - '/status' - Server status information
 * - '/hello' - Welcome message
 * - Any other path returns a 404 error
 *
 * All responses include status, HTTP code, server uptime, current time, client IP,
 * and HTTP version information in JSON format.
 *
 * The function should be called only once during application startup.
 */
function createServer() {
  http
    .createServer((req, res) => {
      const url = req.url;
      const method = req.method;

      // Set response headers for JSON content
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Accept", "application/json");

      let response = {};
      const ip = getClientIp(req);
      const currentTime = new Date().toLocaleString();
      const uptime = formatUptime();
      const version = req.httpVersion;

      // Route handling
      if (url === "/") {
        response = {
          status: "Connected",
          code: res.statusCode,
          uptime: uptime,
          currentTime: currentTime,
          ip: ip,
          version: version,
        };
      } else if (url === "/status") {
        response = {
          status: "Running",
          code: res.statusCode,
          uptime: uptime,
          currentTime: currentTime,
          ip: ip,
          version: version,
        };
      } else if (url === "/hello") {
        response = {
          status: "Hello! Welcome to the server!",
          code: res.statusCode,
          uptime: uptime,
          currentTime: currentTime,
          ip: ip,
          version: version,
        };
      } else {
        // Handle unknown routes with 404
        res.writeHead(404, { "Content-Type": "application/json" });
        response = {
          status: "Not Found",
          code: 404,
          uptime: uptime,
          currentTime: currentTime,
          ip: ip,
          version: version,
          error: "This endpoint does not exist here.",
        };
      }

      try {
        // Send JSON response
        res.write(JSON.stringify(response));
      } catch (error) {
        // Handle serialization errors
        logError(
          `[${new Date().toISOString()}] Failed to write response for IP: ${ip} due to unknown exception: ${error} at url: ${url}`
        );
        res.statusCode = 500;
        res.write(JSON.stringify({ error: "Failed to process response" }));
      }

      // Log the request details
      logDebug(
        `[${new Date().toISOString()}] [IP: ${ip}, CODE: ${res.statusCode}] ${method} - ${url}`
      );
      res.end();
    })
    .listen(PORT, () => {
      // Log server startup information
      logInfo(`Server is running at http://${HOST}:${PORT}`);
      logInfo("Make sure to use your deployed server's public URL if hosted online.");
    });
}

// Initialize the server when the module is loaded
createServer();
