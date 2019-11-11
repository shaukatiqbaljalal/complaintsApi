const Joi = require("joi");
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  extentionName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 10
  },
  maxSize: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 255
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
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
      .required(),
    companyId: Joi.ObjectId().required()
  };

  return Joi.validate(attachment, schema);
}

exports.AttachmentType = AttachmentType;
exports.validate = validateAttachmentType;
