const Joi = require("joi");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

const adminSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      required: false,
      minlength: 9,
      maxlength: 50
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 1024
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    profilePath: {
      type: String,
      required: false,
      minlength: 5,
      maxlength: 1024
    },
    responsibility: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category"
    }
  },
  {
    timestamps: true
  }
);

adminSchema.methods.generateAuthToken = function() {
  // const profilePicture = this.profilePicture ? this.profilePicture : "";
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      role: "admin",
      companyId: this.companyId
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const Admin = mongoose.model("Admin", adminSchema);

function validateAdmin(Admin) {
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
    phone: Joi.string()
      .min(9)
      .max(50),
    companyId: Joi.ObjectId().required(),

    password: Joi.string()
      .min(8)
      .max(255)
      .required(),
    profilePath: Joi.string()
      .min(5)
      .max(255),
    responsibility: Joi.array().items(Joi.ObjectId())
  };

  return Joi.validate(Admin, schema);
}

exports.Admin = Admin;
exports.validate = validateAdmin;
