const winston = require("winston");
require("winston-mongodb");
require("express-async-errors");
const config = require("config");
module.exports = function() {
  const uri = config.get("dbUri");
  winston.handleExceptions(
    new winston.transports.File({ filename: "uncaughtExceptions.log" })
  );

  process.on("unhandledRejection", ex => {
    throw ex;
  });

  winston.add(winston.transports.File, { filename: "logfile.log" });
  winston.add(winston.transports.MongoDB, {
    db: uri,
    level: "info"
  });
};
