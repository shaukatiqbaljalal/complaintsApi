const { Authority, validate } = require("../models/higherAuthority");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const encrypt = require("./../common/encrypt");
const passwordGenrator = require("./../middleware/passwordGenerator");

router.get("/", async (req, res) => {
  let members = await Authority.find().select("name email designation ");
  if (!members) res.status(404).send("No member");
  res.send(members);
});

router.post("/", passwordGenrator, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let member = await Authority.findOne({ email: req.body.email });
  if (member) return res.status(400).send("User already registered.");

  member = new Authority({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    designation: req.body.designation
  });
  member.password = encrypt(member.password);

  await member.save();
  res.send(_.pick(member, ["_id", "name", "email", "designation"]));
});

router.put("/:id", async (req, res) => {
  try {
    let member = await Authority.findById(req.params.id);
    if (!member)
      return res
        .status(404)
        .send("The member with the given ID was not found.");
    if (req.body.email && member.email != req.body.email) {
      let mem = await Authority.findOne({ email: req.body.email });
      if (mem) {
        return res.status(400).send("Given Email Already Exists");
      }
    }
    member = await Authority.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    res.send(_.pick(member, ["_id", "name", "email", "designation"]));
  } catch (error) {
    console.log(error);
  }
});

router.delete("/:id", async (req, res) => {
  let member = await Authority.findByIdAndRemove(req.params.id);
  if (!member) return res.status(404).send("Assignee with given ID Not Found.");

  res.status(200).send(member);
});

module.exports = router;
