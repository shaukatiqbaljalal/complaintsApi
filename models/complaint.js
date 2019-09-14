const Joi = require("joi");
const mongoose = require("mongoose");

const Complaint = mongoose.model(
  "Complaint",
  new mongoose.Schema({
    title: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 255
    },
    details: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 255
    },
    complainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complainer",
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignee"
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    geolocation: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }
    },
    location: {
      type: String,
      min: 0,
      max: 255
    },
    files: {
      type: String
    },
    spam: {
      type: Boolean,
      default: false
    },
    spamBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignee"
    },
    assigned: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: [
        "in-progress",
        "closed - relief granted",
        "closed - relief can't be granted",
        "closed - partial relief granted"
      ],
      default: "in-progress"
    },
    timeStamp: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      default: ""
    },
    feedbackRemarks: {
      type: String,
      minlength: 5,
      maxlength: 255
    },
    feedbackTags: {
      type: String,
      enum: ["satisfied", "not satisfied"]
    },
    severity: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium"
    }
  })
);

function validateComplaint(complaint) {
  const schema = {
    details: Joi.string()
      .min(5)
      .max(255)
      .required(),
    title: Joi.string()
      .required()
      .min(5)
      .max(255),
    category: Joi.ObjectId().required(),
    assignedTo: Joi.ObjectId(),

    location: Joi.string().max(255),
    spam: Joi.boolean(),
    assigned: Joi.boolean(),
    status: Joi.string(),
    timeStamp: Joi.date(),
    geolocation: Joi.object(),
    severity: Joi.string()
  };

  return Joi.validate(complaint, schema);
}

exports.Complaint = Complaint;
exports.validate = validateComplaint;
