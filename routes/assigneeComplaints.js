const { Complaint } = require("../models/complaint");
const { Admin } = require("../models/admin");
const { Notification } = require("../models/notification");
const authAssignee = require("../middleware/authAssignee");
const authUser = require("../middleware/authUser");
const io = require("../socket");
const express = require("express");
const router = express.Router();
const {
  executePagination,
  prepareFilter
} = require("../middleware/pagination");

// Getting complaints of assignee -- Assignee
router.get("/", authAssignee, async (req, res) => {
  console.log("get All complaints");
  const complaints = await Complaint.find({
    assignedTo: req.assignee._id,
    spam: false
  })
    .populate("complainer", "name _id")
    .populate("assignedTo", "name _id")
    .populate("category", "name _id")
    .populate("locationTag", "name _id");

  if (!complaints)
    return res
      .status(404)
      .send("complaints with given Assignee was not found.");

  res.send(complaints);
});

router.get(
  "/paginated/:pageNo/:pageSize",
  authUser,
  prepareFilter,
  (req, res, next) => {
    req.body.filter.assignedTo = req.user._id;
    next();
  },
  executePagination(Complaint)
);

// assignee drop responsibility
router.put("/drop/:id", authAssignee, async (req, res) => {
  let complaint = await Complaint.findById(req.params.id)
    .populate("complainer", "name _id")
    .populate("assignedTo", "name _id")
    .populate("category", "name _id")
    .populate("locationTag", "name _id");

  if (!complaint)
    return res.status(404).send("Complaint with given ID was not found.");
  if (complaint.status !== "in-progress") {
    return res.status(400).send("complaint is already closed");
  }
  console.log("after");
  let assignedToName = complaint.assignedTo.name;

  const admin = await Admin.findOne({
    companyId: req.assignee.companyId
  });

  complaint.assignedTo = {
    _id: admin._id
  };
  complaint.onModel = "Admin";
  complaint.assigned = false;
  console.log(complaint, "Check");

  let notification = new Notification({
    msg: `Complaint is dropped by ${assignedToName}`,
    receivers: {
      role: "admin",
      id: null
    },
    companyId: req.assignee.companyId,
    complaintId: complaint._id
  });

  await complaint.save();
  await notification.save();
  complaint = await Complaint.findById(req.params.id)
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");
  io.getIO().emit("complaints", {
    action: "drop",
    complaint: complaint,
    notification: notification
  });

  console.log("dropped complaint - assignee");
  res.status(200).send("You have successfully dropped responsibility");
});

// marking complaint as spam
router.put("/:spam/:id", authAssignee, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint)
    return res.status(404).send("Complaint with given ID was not found.");
  if (complaint.status !== "in-progress") {
    return res.status(400).send("complaint is already closed");
  }
  complaint.spam = req.params.spam;
  complaint.status = "closed - relief can't be granted";
  complaint.spamBy = req.assignee._id;
  console.log(complaint.spamBy);

  await complaint.save();
  res.status(200).send("Complaint is marked as spam successfully");
});

// remove complaint as spam
router.put("/remove/spam/:id", authAssignee, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint)
    return res.status(404).send("Complaint with given ID was not found.");

  complaint.spam = false;

  complaint.status = "in-progress";
  complaint.spamBy = null;

  await complaint.save();
  res.status(200).send("Complaint is removed as spam successfully");
});

// change status of a complaint
router.put("/:id/:status/:remarks", authAssignee, async (req, res) => {
  // const complaint = await Complaint.findOne({ _id: req.params.id });

  const complaint = await Complaint.findById(req.params.id)
    .populate("complainer", "name _id")
    .populate("assignedTo", "name _id")
    .populate("category", "name _id")
    .populate("locationTag", "name _id");

  let remarks = complaint.remarks;
  let newRemarks = `From: ${complaint.status} To: ${req.params.status}> ${req.params.remarks}`;
  remarks.push(newRemarks);
  complaint.set("remarks", remarks);
  complaint.set("status", req.params.status);
  if (req.params.status === "in-progress") {
    complaint.set("feedbackTags", "");
  }

  let notification = new Notification({
    msg: `Complaint status has been changed.`,
    receivers: {
      role: "",
      id: complaint.complainer._id
    },
    companyId: req.assignee.companyId,
    complaintId: complaint._id
  });

  await complaint.save();
  await notification.save();
  let newUp = await Complaint.findById(req.params.id)
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");
  io.getIO().emit("complaints", {
    action: "status changed",
    complaint: newUp,
    notification: notification
  });

  console.log("status changed - assignee");

  res.status(200).send(newUp);
});

// change status of a complaint
router.put("/:id", authAssignee, async (req, res) => {
  // const complaint = await Complaint.findOne({ _id: req.params.id });

  const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body)
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");

  let notification = new Notification({
    msg: "Complaint is Re-opened",
    receivers: {
      role: "",
      id: complaint.assignedTo._id
    },
    companyId: req.assignee.companyId,
    complaintId: complaint._id
  });

  let newUp = await Complaint.findById(req.params.id)
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");

  io.getIO().emit("complaints", {
    action: "status changed",
    complaint: newUp,
    notification: notification
  });
  console.log("status changed - assignee - re-opened");

  await notification.save();

  res.status(200).send(newUp);
});

module.exports = router;
