let io;

module.exports = {
  init: httpServer => {
    io = require("socket.io")(httpServer, { wsEngine: "ws" });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket is not initialized");
    }
    return io;
  }
};
