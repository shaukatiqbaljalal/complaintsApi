const Joi = require("joi");
const bcrypt = require("bcryptjs");
const express = require("express");
const _ = require("lodash");
const { Admin } = require("../models/admin");
const router = express.Router();
const decrypt = require("./../common/decrypt");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let admin = await Admin.findOne({ email: req.body.email });
  console.log(admin);
  console.log("After Admin");
  if (!admin) return res.status(400).send("Invalid email or password.");
  if (req.body.password !== decrypt(admin.password))
    return res.status(400).send("Invalid email or password.");

  const token = admin.generateAuthToken();

  res
    .header("x-auth-token", token)
    .header("access-control-expose-headers", "x-auth-token")
    .send(admin);
});

function validate(req) {
  const schema = {
    email: Joi.string()
      .min(5)
      .max(255)
      .required()
      .email(),
    password: Joi.string()
      .min(5)
      .max(255)
      .required()
  };

  return Joi.validate(req, schema);
}

module.exports = router;
