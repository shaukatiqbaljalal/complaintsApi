const Joi = require("joi");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50
  }
});

companySchema.methods.generateAuthToken = function() {
  // const profilePicture = this.profilePicture ? this.profilePicture : "";
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      companyId: this.companyId
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const Company = mongoose.model("Company", companySchema);

function validateCompany(Company) {
  const schema = {
    name: Joi.string()
      .min(5)
      .max(50)
      .required()
  };

  return Joi.validate(Company, schema);
}

exports.Company = Company;
exports.validate = validateCompany;
