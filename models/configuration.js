const Joi = require("joi");
const mongoose = require("mongoose");

const configurationSchema = new mongoose.Schema({
  isAccountCreation: {
    type: Boolean,
    required: true
  },
  isMessaging: {
    type: Boolean,
    required: true
  }
});

const Configuration = mongoose.model("Configuration", configurationSchema);

function validateAttachmentType(configuration) {
  const schema = {
    isAccountCreation: Joi.boolean().required(),
    isMessaging: Joi.boolean().required()
  };

  return Joi.validate(configuration, schema);
}

exports.Configuration = Configuration;
exports.validate = validateAttachmentType;
