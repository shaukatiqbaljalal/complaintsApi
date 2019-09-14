const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

const userSchema = new mongoose.Schema({
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
    unique: false
  },
  phone: {
    type: String,
    required: false,
    minlength: 9,
    maxlength: 50
  },
  address: {
    type: String,
    required: true,
    minlength: 5
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
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
  role: {
    type: String,
    required: true,
    maxlength: 1024
  },
  companyOwnerName: {
    type: String,
    minlength: 5
  },
  nextToKinName: {
    type: String,
    minlength: 5
  },
  nextToKinCnic: {
    type: String,
    minlength: 13,
    maxlength: 13
  },
  cnic: {
    type: String,
    minlength: 13,
    maxlength: 13
  },
  profilePicture: {
    type: Buffer
  }
});

userSchema.methods.generateAuthToken = function() {
  // const profilePicture = this.profilePicture ? this.profilePicture : "";

  // console.log(this.profilePicture);
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      role: this.role,
      companyId: this.companyId
      // profilePicture: profilePicture
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  let schema = {
    name: Joi.string()
      .min(5)
      .max(50)
      .required(),
    address: Joi.string()
      .min(5)
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
    role: Joi.string().required(),
    profilePicture: Joi.binary()
  };

  if (user.role === "agent") {
    schema.companyOwnerName = Joi.string().min(5);
  }

  if (user.role === "customer") {
    schema.cnic = Joi.string()
      .min(13)
      .max(13)
      .required();
    schema.nextToKinCnic = Joi.string()
      .min(13)
      .max(13)
      .required();
    schema.nextToKinName = Joi.string()
      .min(5)
      .required();
  }
  return Joi.validate(user, schema);
}

exports.User = User;
exports.validate = validateUser;
