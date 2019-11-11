const { Authority, validate } = require("../models/higherAuthority");
const deleteFile = require("./../common/deleteFile");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const encrypt = require("./../common/encrypt");
const passwordGenrator = require("./../middleware/passwordGenerator");
const { getReportsEmailOptions } = require("../common/sendEmail");
const sendEmail = require("../common/sendEmail");
const path = require("path");
const authUser = require("./../middleware/authUser");

router.get("/", authUser, async (req, res) => {
  let members = await Authority.find({ companyId: req.user.companyId }).select(
    "name email designation "
  );
  if (!members) res.status(404).send("No member");
  res.send(members);
});

router.post("/sendreports/members", authUser, async (req, res) => {
  let recieversList = JSON.parse(req.body.recievers);
  console.log(recieversList);
  console.log(req.body.reportName);
  const filePath = path.join("public", "files", "reports", req.body.reportName);
  for (let index = 0; index < recieversList.length; index++) {
    const reciever = recieversList[index];

    const options = getReportsEmailOptions(
      reciever.email,
      "Complaints Summary",
      filePath
    );
    console.log(options);
    sendEmail(options);
  }
  deleteFile(filePath);
});

router.post("/", authUser, passwordGenrator, async (req, res) => {
  if (!req.body.companyId) req.body.companyId = req.user.companyId;

  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let member = await Authority.findOne({
    email: req.body.email,
    companyId: req.user.companyId
  });
  if (member) return res.status(400).send("User already registered.");

  member = new Authority({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    designation: req.body.designation,
    companyId: req.user.companyId
  });

  member.password = encrypt(member.password);
  try {
    await member.save();
    res.send(_.pick(member, ["_id", "name", "email", "designation"]));
  } catch (error) {
    res.status(500).send("Some error occurred", error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    let member = await Authority.findById(req.params.id);
    if (!member)
      return res
        .status(404)
        .send("The member with the given ID was not found.");
    if (req.body.email && member.email != req.body.email) {
      let mem = await Authority.findOne({
        email: req.body.email,
        companyId: member.companyId
      });
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
