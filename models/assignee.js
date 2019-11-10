const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

const assigneeSchema = new mongoose.Schema(
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
      maxlength: 255,
      unique: true
    },
    phone: {
      type: String,
      required: false,
      minlength: 9,
      maxlength: 50
    },

    responsibilities: {
      type: [{}],
      ref: "Category",
      required: false
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
    chatWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complainer"
    },
    profilePicture: {
      type: Buffer
    }
  },
  {
    timestamps: true
  }
);

assigneeSchema.methods.generateAuthToken = function() {
  // const profilePicture = this.profilePicture ? this.profilePicture : "";

  // console.log(this.profilePicture);
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      role: "assignee"
      // profilePicture: profilePicture
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const Assignee = mongoose.model("Assignee", assigneeSchema);

function validateAssignee(assignee) {
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

    responsibilities: Joi.array().items(Joi.object()),
    password: Joi.string()
      .min(8)
      .max(255)
      .required(),
    profilePath: Joi.string()
      .min(5)
      .max(255),
    chatWith: Joi.ObjectId(),
    profilePicture: Joi.binary()
  };

  return Joi.validate(assignee, schema);
}

exports.Assignee = Assignee;
exports.validate = validateAssignee;
