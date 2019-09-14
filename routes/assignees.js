const { Assignee, validate } = require("../models/assignee");
const { Category } = require("../models/category");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const _ = require("lodash");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let assignee = await Assignee.findOne({ email: req.body.email });
  if (assignee) return res.status(400).send("User already registered.");

  for (i = 0; i < req.body.responsibility.length; i++) {
    let category = await Category.findOne({ _id: req.body.responsibility[i] });
    if (!category) return res.status(400).send("Invalid Category.");
  }

  assignee = new Assignee({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    responsibility: req.body.responsibility
  });

  const salt = await bcrypt.genSalt(10);
  assignee.password = await bcrypt.hash(assignee.password, salt);

  await assignee.save();
  res.send(_.pick(assignee, ["_id", "name", "email"]));
});

router.get("/all", async (req, res) => {
  const assignees = await Assignee.find();

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

router.put("/change/chatwith/messages/:assigneeId/:id", async (req, res) => {
  const assignee = await Assignee.findOne({ _id: req.params.assigneeId });

  if (!assignee) return res.status(404).send("No Assignee found.");

  assignee.chatWith = req.params.id;

  await assignee.save();

  res.send(assignee);
});

//getting assignee based on his/her _id
router.get("/me/:id", async (req, res) => {
  const assignees = await Assignee.findOne({ _id: req.params.id });

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

// getting assignee based on responsbility
router.get("/:id", async (req, res) => {
  const assignees = await Assignee.find({ responsibility: req.params.id });

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

//

module.exports = router;

// /api/assignees
