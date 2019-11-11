const { Complaint } = require("../models/complaint");
const { Admin } = require("../models/admin");
const authAssignee = require("../middleware/authAssignee");
const io = require("../socket");
const express = require("express");
const router = express.Router();

// Getting complaints of assignee -- Assignee
router.get("/", authAssignee, async (req, res) => {
  const complaints = await Complaint.find({
    assignedTo: req.assignee._id,
    spam: false
  })
    .populate("assignedTo", "name -_id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");

  if (!complaints)
    return res
      .status(404)
      .send("complaints with given Assignee was not found.");

  res.send(complaints);
});

// assignee drop responsibility
router.put("/drop/:id", authAssignee, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint)
    return res.status(404).send("Complaint with given ID was not found.");
  if (complaint.status !== "in-progress") {
    return res.status(400).send("complaint is already closed");
  }
  console.log("after");
  const admin = await Admin.findOne({
    companyId: req.assignee.companyId
  });

  complaint.assignedTo = {
    _id: admin._id
  };
  complaint.assigned = false;

  try {
    await complaint.save();
    io.getIO().emit("complaints", {
      action: "drop",
      complaint: complaint
    });
    console.log("dropped complaint - assignee");
    res.status(200).send("You have successfully dropped responsibility");
  } catch (error) {
    res.status(500).send("Some error occured", error);
  }
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
  try {
    await complaint.save();
    res.status(200).send("Complaint is marked as spam successfully");
  } catch (error) {
    res.status(500).send("Some error occured", error);
  }
});

// remove complaint as spam
router.put("/remove/spam/:id", authAssignee, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint)
    return res.status(404).send("Complaint with given ID was not found.");

  complaint.spam = false;

  complaint.status = "in-progress";
  complaint.spamBy = null;
  try {
    await complaint.save();
    res.status(200).send("Complaint is removed as spam successfully");
  } catch (error) {
    res.status(500).send("Some error occured", error);
  }
});

// getting all spam complaints
router.get("/assignee/spam/complaints", authAssignee, async (req, res) => {
  const complaints = await Complaint.find({ spamBy: req.assignee._id })
    .select("_id title status")
    .populate("category", "name _id");
  if (!complaints) return res.status(404).send("No Spam list found.");
  res.send(complaints);
});

// change status of a complaint
router.put("/:id/:status/:remarks", authAssignee, async (req, res) => {
  // const complaint = await Complaint.findOne({ _id: req.params.id });
  const complaint = await Complaint.findById(req.params.id);

  complaint.status = req.params.status;
  complaint.remarks = req.params.remarks;
  try {
    await complaint.save();

    io.getIO().emit("complaints", {
      action: "status changed",
      complaint: complaint
    });
    console.log("status changed - assignee");

    res.status(200).send(complaint);
  } catch (error) {
    res.status(500).send("Some error occured", error);
  }
});

// Assignee can get any complaint by ID -- Assignee
router.get("/:id", authAssignee, async (req, res) => {
  const complaint = await Complaint.findOne({
    _id: req.params.id,
    assignedTo: req.assignee._id
  })
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");
  if (!complaint)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaint);
});

module.exports = router;
