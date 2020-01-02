const { AttachmentType, validate } = require("../models/attachment");
const express = require("express");
const router = express.Router();
const authUser = require("./../middleware/authUser");
const _ = require("lodash");

router.get("/", authUser, async (req, res) => {
  let attachments = await AttachmentType.find({
    companyId: req.user.companyId
  }).select("extentionName maxSize");
  if (!attachments) return res.status(404).send("No Attachment");
  res.send(attachments);
});

router.post("/", authUser, async (req, res) => {
  if (!req.body.companyId) req.body.companyId = req.user.companyId;
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  let exeName = req.body.extentionName.trim();
  if (exeName[0] == ".") {
    exeName = exeName.split(".")[1];
  }
  let attachment = await AttachmentType.findOne({
    extentionName: exeName,
    companyId: req.body.companyId
  });
  if (attachment) return res.status(400).send("Attachment already registered.");
  req.body.extentionName = exeName;
  attachment = new AttachmentType(req.body);

  await attachment.save();
  res.send(_.pick(attachment, ["_id", "extentionName", "maxSize"]));
});

router.put("/:id", authUser, async (req, res) => {
  let attachment = await AttachmentType.findById(req.params.id);
  if (!attachment)
    return res
      .status(404)
      .send("The attachment with the given ID was not found.");
  if (
    req.body.extentionName &&
    attachment.extentionName != req.body.extentionName
  ) {
    let attach = await AttachmentType.findOne({
      extentionName: req.body.extentionName,
      companyId: attachment.companyId
    });
    if (attach) {
      return res.status(400).send("Given Attachment Already Exists");
    }
  }
  attachment = await AttachmentType.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  });

  res.send(_.pick(attachment, ["_id", "extentionName", "maxSize"]));
});
router.delete("/:id", async (req, res) => {
  let attachment = await AttachmentType.findByIdAndRemove(req.params.id);
  if (!attachment)
    return res.status(404).send("Attachment with given ID Not Found.");

  res.status(200).send(attachment);
});

module.exports = router;
