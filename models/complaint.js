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
      refPath: "onModel"
    },
    onModel: {
      type: "String",
      required: true,
      enum: ["Admin", "Assignee"]
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    locationTag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },
    geolocation: {
      lat: { type: String },
      lng: { type: String }
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
      type: [String],
      default: ""
    },
    feedbackRemarks: {
      type: String,
      minlength: 5,
      maxlength: 255
    },
    feedbackTags: {
      type: String,
      enum: ["satisfied", "not satisfied", ""]
    },
    severity: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium"
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
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
    locationTag: Joi.ObjectId(),
    assignedTo: Joi.ObjectId(),
    companyId: Joi.ObjectId().required(),

    location: Joi.string().max(255),
    spam: Joi.boolean(),
    assigned: Joi.boolean(),
    status: Joi.string(),
    timeStamp: Joi.date(),
    geolocation: Joi.object(),
    severity: Joi.string(),
    onModel: Joi.string()
  };

  return Joi.validate(complaint, schema);
}

exports.Complaint = Complaint;
exports.validate = validateComplaint;
