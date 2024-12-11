const http = require("http");
const { logDebug, logInfo } = require("./utilities");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

http
  .createServer((req, res) => {
    const url = req.url;
    const method = req.method;

    res.setHeader("Content-Type", "text/plain");

    if (url === "/") {
      res.write("I am alive and connected!");
    } else if (url === "/status") {
      res.write("Server is running smoothly.\n");
      res.write(`Current Time: ${new Date().toLocaleString()}\n`);
    } else if (url === "/hello") {
      res.write("Hello there! Welcome to the server.");
    } else {
      res.statusCode = 404;
      res.write("404 Not Found: The requested resource does not exist.");
    }

    logDebug(`[${new Date().toISOString()}] ${method} ${url}`);

    res.end();
  })
  .listen(PORT, HOST, () => {
    const detectedHost = HOST === "0.0.0.0" ? "localhost" : HOST;
    logInfo(`Server is running at http://${detectedHost}:${PORT}`);
    logInfo(
      "Make sure to use your deployed server's public URL if hosted online."
    );
  });
