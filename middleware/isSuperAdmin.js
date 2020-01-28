module.exports = function(req, res, next) {
  if (req.user && req.user.role === "superAdmin") {
    next();
  } else {
    return res.status(501).send("You are not authorized");
  }
};
