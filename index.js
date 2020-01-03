const express = require("express");
const app = express();
// connection to MongoDB
// ---------------------//
// ---------------------//
require("./startup/logging")();
require("./startup/routes")(app);
require("./startup/prod")(app);
require("./startup/db")();
require("./startup/config")();
require("./startup/validation")();

//uncaught exception...
const port = process.env.PORT || 5000;
const server = app.listen(port, () =>
  console.log(`Listening on port ${port}...`)
);

const io = require("./socket").init(server);
io.on("connection", socket => {
  console.log("New client connected");
  socket.on("disconnect", () => {
    console.log("Client is disconnected");
  });
});
