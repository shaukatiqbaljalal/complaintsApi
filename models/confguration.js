const Joi = require("joi");
const mongoose = require("mongoose");

const Configuration = mongoose.model(
  "Configuration",
  new mongoose.Schema({
    isMessaging: { type: Boolean, required: true },
    isAccountCreation: {
      type: Boolean,
      required: true
    },
    isBranchCreation: {
      type: Boolean,
      required: true
    },
    isAccountDeletion: {
      type: Boolean,
      required: true
    },
    attachmentTypes: {
      type: [String],
      required: true
    },
    severity: {
      type: Boolean
    }
  })
);

function validateConfiguration(configure) {
  const schema = {
    isMessaging: Joi.boolean().required(),
    isAccountCreation: Joi.boolean().required(),
    isAccountDeletion: Joi.boolean().required(),
    isBranchCreation: Joi.boolean().required(),
    attachmentTypes: Joi.array()
      .items(String)
      .required()
  };

  return Joi.validate(configure, schema);
}

exports.Configuration = Configuration;
exports.validate = validateConfiguration;
