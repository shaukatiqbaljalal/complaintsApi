const Joi = require("joi");

const express = require("express");
const _ = require("lodash");
const { Complainer } = require("../models/complainer");
const router = express.Router();
const decrypt = require("./../common/decrypt");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let complainer = await Complainer.findOne({
    email: req.body.email,
    companyId: req.body.companyId
  });

  if (!complainer) return res.status(400).send("Invalid email or password.");
  if (req.body.password !== decrypt(complainer.password))
    return res.status(400).send("Invalid email or password.");

  const token = complainer.generateAuthToken();

  res
    .header("x-auth-token", token)
    .header("access-control-expose-headers", "x-auth-token")
    .send(complainer);
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
      .required(),
    companyId: Joi.string()
      .min(20)
      .required()
  };

  return Joi.validate(req, schema);
}

module.exports = router;

// /api/complainers
// set quickresponse_jwtPrivateKey=mySecretKey
