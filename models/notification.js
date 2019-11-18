const Joi = require("joi");
Joi.ObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const Notification = mongoose.model(
  "Notification",
  new mongoose.Schema(
    {
      msg: {
        type: String,
        required: true
      },
      receivers: {
        role: String,
        id: mongoose.Schema.Types.ObjectId
      },
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
        // type: String
      },
      complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint"
      }
    },
    { timestamps: true }
  )
);

function validateNotification(notification) {
  const schema = {
    msg: Joi.string().required(),
    receivers: Joi.object()
  };

  return Joi.validate(notification, schema);
}

exports.Notification = Notification;
exports.validate = validateNotification;
