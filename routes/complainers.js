const { Complainer, validate } = require("../models/complainer");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const _ = require("lodash");

router.get("/:id", async (req, res) => {
  const complainer = await Complainer.findOne({ _id: req.params.id });

  if (!complainer) return res.status(404).send("There are no complainer.");

  res.status(200).send(complainer);
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let complainer = await Complainer.findOne({ email: req.body.email });

  if (complainer) return res.status(400).send("User already registered.");

  complainer = new Complainer(_.pick(req.body, ["name", "email", "password"]));

  const salt = await bcrypt.genSalt(10);
  complainer.password = await bcrypt.hash(complainer.password, salt);
  await complainer.save();

  res.send(_.pick(complainer, ["_id", "name", "email"]));
});

module.exports = router;

// /api/complainers
