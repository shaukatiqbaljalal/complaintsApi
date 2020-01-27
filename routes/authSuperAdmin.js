const Joi = require("joi");
const express = require("express");
const { SuperAdmin } = require("../models/superAdmin");
const router = express.Router();
const decrypt = require("./../common/decrypt");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let superAdmin = await SuperAdmin.findOne({
    email: req.body.email.toLowerCase()
  });

  if (!superAdmin) return res.status(400).send("Invalid email or password.");
  if (req.body.password !== decrypt(superAdmin.password))
    return res.status(400).send("Invalid email or password.");

  const token = superAdmin.generateAuthToken();

  res
    .header("x-auth-token", token)
    .header("access-control-expose-headers", "x-auth-token")
    .send(superAdmin);
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
