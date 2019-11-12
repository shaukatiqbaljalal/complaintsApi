const Joi = require("joi");
const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const config = require("config");

const companySchema = new mongoose.Schema({
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

// companySchema.methods.generateAuthToken = function() {
//   // const profilePicture = this.profilePicture ? this.profilePicture : "";
//   const token = jwt.sign(
//     {
//       _id: this._id,
//       name: this.name,
//       companyId: this.companyId
//     },
//     config.get("jwtPrivateKey")
//   );
//   return token;
// };

const Company = mongoose.model("Company", companySchema);

function validateCompany(Company) {
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
  return Joi.validate(Company, schema);
}

exports.Company = Company;
exports.validate = validateCompany;
