const Joi = require("joi");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

const superAdminSchema = new mongoose.Schema(
  {
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
      maxlength: 255
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 1024
    },

    profilePath: {
      type: String,
      required: false,
      minlength: 5,
      maxlength: 1024
    },
    profilePicture: { type: Buffer }
  },
  {
    timestamps: true
  }
);

superAdminSchema.methods.generateAuthToken = function() {
  // const profilePicture = this.profilePicture ? this.profilePicture : "";
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      role: "superAdmin"
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);

function validateSuperAdmin(SuperAdmin) {
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
      .min(8)
      .max(255)
      .required(),
    profilePath: Joi.string()
      .min(5)
      .max(255),
    profilePicture: Joi.binary()
  };

  return Joi.validate(SuperAdmin, schema);
}

exports.SuperAdmin = SuperAdmin;
exports.validate = validateSuperAdmin;
