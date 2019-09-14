const Joi = require("joi");
const mongoose = require("mongoose");

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    messageBody: {
      type: String,
      required: true,
      min: 1
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now()
    }
    // attachment: {
    //   type: Buffer
    // }
  })
);

function validateMessage(message) {
  const schema = {
    messageBody: Joi.string()
      .min(1)
      .required()
    // sender: Joi.ObjectId().required(),
    // receiver: Joi.ObjectId().required()
  };

  return Joi.validate(message, schema);
}

exports.Message = Message;
exports.validate = validateMessage;
