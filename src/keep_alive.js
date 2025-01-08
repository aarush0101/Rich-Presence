const http = require("http");
const { logDebug, logInfo, logError } = require("./utilities");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "localhost";

// Record the start time
const startTime = Date.now();

/**
 * Calculates the total uptime of the server till now.
 * @returns string: The uptime of the server
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
 *
 * @param {*} req: The request object
 * @returns string: The remoteAddress or IP of the peer
 */
function getClientIp(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

/**
 * Creates a new server session.
 * To be only called once per run.
 */
function createServer() {
  http
    .createServer((req, res) => {
      const url = req.url;
      const method = req.method;

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Accept", "application/json");

      let response = {};
      const ip = getClientIp(req);
      const currentTime = new Date().toLocaleString();
      const uptime = formatUptime();
      const version = req.httpVersion;

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
        res.write(JSON.stringify(response));
      } catch (error) {
        logError(
          `[${new Date().toISOString()}] Failed to write response for IP: ${ip} due to unknown exception: ${error} at url: ${url}`
        );
        res.statusCode = 500;
        res.write(JSON.stringify({ error: "Failed to process response" }));
      }

      logDebug(
        `[${new Date().toISOString()}] [IP: ${ip}, CODE: ${
          res.statusCode
        }] ${method} - ${url}`
      );
      res.end();
    })
    .listen(PORT, () => {
      logInfo(`Server is running at http://${HOST}:${PORT}`);
      logInfo(
        "Make sure to use your deployed server's public URL if hosted online."
      );
    });
}

createServer();
