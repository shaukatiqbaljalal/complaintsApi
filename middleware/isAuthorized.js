module.exports = function(req, res, next) {
  console.log(req.body);
  if (req.body.role) {
    if (req.body.role == "agent" && req.user.role === "admin") {
      next();
    } else if (req.body.role == "customer" && req.user.role === "agent") {
      next();
    } else {
      res.status(401).send("you are not authorized to perform this task");
    }
  } else {
    res.status(400).send("Role must be specified");
  }
};
