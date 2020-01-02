const mongoose = require("mongoose");
const config = require("config");
const winston = require("winston");

module.exports = function() {
  const uri = config.get("dbUri");
  mongoose
    .connect(uri)
    .then(() => winston.info("Connected to MongoDB..."))
    .catch(err => console.error("Could not connect to MongoDB..."));
};
