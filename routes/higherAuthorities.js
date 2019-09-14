const { Authority, validate } = require("../models/higherAuthority");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const _ = require("lodash");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let authority = await Authority.findOne({ email: req.body.email });
  if (authority) return res.status(400).send("User already registered.");

  authority = new Authority({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    designation: req.body.designation
  });

  const salt = await bcrypt.genSalt(10);
  authority.password = await bcrypt.hash(authority.password, salt);

  await authority.save();
  res.send(_.pick(authority, ["_id", "name", "email"]));
});

module.exports = router;
