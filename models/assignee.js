const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

const assigneeSchema = new mongoose.Schema({
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
  responsibility: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Category",
    required: true
  },
  chatWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complainer"
  }
});

assigneeSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { _id: this._id, name: this.name, role: "assignee" },
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
    password: Joi.string()
      .min(5)
      .max(255)
      .required(),
    responsibility: Joi.array()
      .items(Joi.ObjectId())
      .required(),
    chatWith: Joi.ObjectId()
  };

  return Joi.validate(assignee, schema);
}

exports.Assignee = Assignee;
exports.validate = validateAssignee;
