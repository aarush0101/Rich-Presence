var http = require("http");

http
  .createServer(function (req, res) {
    res.write("I am alive and connected!");
    res.end();
  })
  .listen(8080);
