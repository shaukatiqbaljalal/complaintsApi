const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const Location = mongoose.model(
  "Location",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 50
    },
    parentLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location"
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    hasChild: {
      type: Boolean
    }
  })
);

function validateLocation(location) {
  const schema = {
    name: Joi.string()
      .min(4)
      .required(),
    parentLocation: Joi.ObjectId(),
    hasChild: Joi.boolean(),
    companyId: Joi.ObjectId().required()
  };

  return Joi.validate(location, schema);
}

exports.Location = Location;
exports.validate = validateLocation;
