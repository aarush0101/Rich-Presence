const http = require("http");
const { logDebug, logInfo } = require("./utilities");

// Use the platform-assigned port, or default to 8080 locally
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "localhost";

const startTime = Date.now();

// Function to format time as hh:mm:ss:ms
function formatUptime() {
  const uptime = Date.now() - startTime;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
  const milliseconds = uptime % 1000;

  return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
}

// Create the server
http
  .createServer((req, res) => {
    const url = req.url;
    const method = req.method;

    // Set HTTP headers
    res.setHeader("Content-Type", "text/plain");

    // Route handling
    if (url === "/") {
      res.write(`Connected!\n`);
      res.write(`Uptime: ${formatUptime()}`)
    } else if (url === "/status") {
      res.write("Server is running smoothly.\n");
      res.write(`Current Time: ${new Date().toLocaleString()}\n`);
      res.write(`Current Time: ${formatUptime()}`);
    } else if (url === "/hello") {
      res.write("Hello there! Welcome to the server.");
    } else {
      res.statusCode = 404;
      res.write("404 Not Found: The requested resource does not exist.");
    }

    logDebug(`[${new Date().toISOString()}] ${method} ${url}`);
    res.end();
  })
  .listen(PORT, () => {
    logInfo(`Server is running at http://${HOST}:${PORT}`);
    logInfo("Make sure to use your deployed server's public URL if hosted online.");
  });
