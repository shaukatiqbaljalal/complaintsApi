module.exports = function(req, res, next) {
  const retVal = gen();
  if (!req.body.password) req.body.password = retVal;
  next();
};
function gen() {
  var length = 10,
    charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

module.exports.generatePassword = gen;
