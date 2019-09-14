module.exports = function(req, res, next) {
  if (req.user.companyId === req.body.companyId) {
    next();
  } else {
    res.status(401).send("you are not of the same company");
  }
};
