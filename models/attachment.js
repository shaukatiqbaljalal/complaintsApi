const Joi = require("joi");
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  extentionName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 10,
    unique: true
  },
  maxSize: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 255
  }
});

const AttachmentType = mongoose.model("AttachmentType", attachmentSchema);

function validateAttachmentType(attachment) {
  const schema = {
    extentionName: Joi.string()
      .min(2)
      .max(10)
      .required(),
    maxSize: Joi.string()
      .min(1)
      .max(255)
      .required()
  };

  return Joi.validate(attachment, schema);
}

exports.AttachmentType = AttachmentType;
exports.validate = validateAttachmentType;
