const Joi = require("joi");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");
const _ = require("lodash");
const { User } = require("../models/user");
const router = express.Router();
const decrypt = require("./../common/decrypt");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({
    email: req.body.email,
    companyId: req.body.companyId
  });

  if (!user) return res.status(400).send("Invalid email or password.");
  if (req.body.password !== decrypt(user.password))
    return res.status(400).send("Invalid email or password.");

  const token = user.generateAuthToken();

  res
    .header("x-auth-token", token)
    .header("access-control-expose-headers", "x-auth-token")
    .send(user);
});

function validate(body) {
  const schema = {
    email: Joi.string()
      .min(5)
      .max(255)
      .required()
      .email(),
    password: Joi.string()
      .min(5)
      .max(255)
      .required(),
    companyId: Joi.ObjectId().required()
  };

  return Joi.validate(body, schema);
}

module.exports = router;

// /api/complainers
// set quickresponse_jwtPrivateKey=mySecretKey
