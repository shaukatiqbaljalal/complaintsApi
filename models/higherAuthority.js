const Joi = require("joi");
const mongoose = require("mongoose");

const authoritySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024
  },
  designation: {
    type: String,
    required: true
  }
});

const Authority = mongoose.model("Authority", authoritySchema);

function validateAuthority(authority) {
  const schema = {
    name: Joi.string()
      .min(5)
      .max(50)
      .required(),
    email: Joi.string()
      .min(5)
      .max(255)
      .required()
      .email(),
    password: Joi.string()
      .min(5)
      .max(255)
      .required(),
    designation: Joi.string().required()
  };

  return Joi.validate(authority, schema);
}

exports.Authority = Authority;
exports.validate = validateAuthority;
