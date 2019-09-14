const config = require("config");
const privateKey = config.get("jwtPrivateKey");
const crypto = require("crypto");

function decrypt(text) {
  var decipher = crypto.createDecipher("aes-256-cbc", privateKey);
  var dec = decipher.update(text, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

module.exports = decrypt;
