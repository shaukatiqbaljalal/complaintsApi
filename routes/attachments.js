const { AttachmentType, validate } = require("../models/attachment");
const express = require("express");
const router = express.Router();
const _ = require("lodash");

router.get("/", async (req, res) => {
  let attachments = await AttachmentType.find().select("extentionName maxSize");
  if (!attachments) res.status(404).send("No Attachment");
  res.send(attachments);
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  let exeName = req.body.extentionName.trim();
  if (exeName[0] == ".") {
    exeName = exeName.split(".")[1];
  }
  let attachment = await AttachmentType.findOne({
    extentionName: exeName
  });
  if (attachment) return res.status(400).send("Attachment already registered.");

  attachment = new AttachmentType({
    extentionName: exeName,
    maxSize: req.body.maxSize
  });

  await attachment.save();
  res.send(_.pick(attachment, ["_id", "extentionName", "maxSize"]));
});

router.put("/:id", async (req, res) => {
  try {
    let attachment = await AttachmentType.findById(req.params.id);
    if (!attachment)
      return res
        .status(404)
        .send("The attachment with the given ID was not found.");
    if (
      req.body.extentionName &&
      attachment.extentionName != req.body.extentionName
    ) {
      let mem = await AttachmentType.findOne({
        extentionName: req.body.extentionName
      });
      if (mem) {
        return res.status(400).send("Given Attachment Already Exists");
      }
    }
    attachment = await AttachmentType.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true
      }
    );

    res.send(_.pick(attachment, ["_id", "extentionName", "maxSize"]));
  } catch (error) {
    console.log(error);
  }
});
router.delete("/:id", async (req, res) => {
  let attachment = await AttachmentType.findByIdAndRemove(req.params.id);
  if (!attachment)
    return res.status(404).send("Attachment with given ID Not Found.");

  res.status(200).send(attachment);
});

module.exports = router;
