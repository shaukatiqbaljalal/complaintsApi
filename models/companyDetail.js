const Joi = require("joi");
const mongoose = require("mongoose");
const companyDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50
  },

  address: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255
  },
  phone: {
    type: String,
    required: false,
    minlength: 9,
    maxlength: 50
  },

  profilePath: {
    type: String,
    required: false,
    minlength: 5,
    maxlength: 1024
  },
  profilePicture: { type: Buffer }
});

const CompanyDetail = mongoose.model("CompanyDetail", companyDetailsSchema);

function validateForm(companyDetails) {
  const schema = {
    name: Joi.string()
      .min(5)
      .max(50)
      .required(),
    address: Joi.string().required(),
    phone: Joi.string()
      .min(9)
      .max(50),

    profilePath: Joi.string()
      .min(5)
      .max(255),
    profilePicture: Joi.binary()
  };

  return Joi.validate(companyDetails, schema);
}

exports.CompanyDetail = CompanyDetail;
exports.validate = validateForm;
