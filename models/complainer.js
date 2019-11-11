const jwt = require("jsonwebtoken");
const config = require("config");
const Joi = require("joi");
const mongoose = require("mongoose");
const complainerSchema = new mongoose.Schema(
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
    profilePicture: { type: Buffer }
  },
  {
    timestamps: true
  }
);

complainerSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      role: "complainer",
      companyId: this.companyId
    },
    config.get("jwtPrivateKey")
  );
  return token;
};
const Complainer = mongoose.model("Complainer", complainerSchema);

function validateComplainer(complainer) {
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
    profilePicture: Joi.binary()
  };

  return Joi.validate(complainer, schema);
}

exports.Complainer = Complainer;
exports.validate = validateComplainer;
