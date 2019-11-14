const { Complaint } = require("../models/complaint");
const authUser = require("../middleware/authUser");

const { Assignee } = require("../models/assignee");
const { Notification } = require("../models/notification");
const authAdmin = require("../middleware/authAdmin");
const io = require("../socket");
const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
// const mongoose = require("mongoose");

// Getting complaints of Admin -- Admin
router.get("/", authAdmin, async (req, res) => {
  const complaints = await Complaint.find({ companyId: req.admin.companyId })
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");
  // const complaints = await Complaint.find({
  //   complainer: req.complainer._id
  // })
  //   // .populate('category', 'name -_id')
  //   // .populate('complainer', 'name -_id')
  //   // .populate('assignedTo', 'name -_id')
  //   .select('title status details location -_id');

  if (!complaints) return res.status(404).send("No complaints was found.");

  res.send(complaints);
});

// Admin can get any complaint by ID -- Admin
router.get("/:id", authUser, async (req, res) => {
  // if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  //   return res.status(400).send("The id is not valid.");
  // }
  const complaint = await Complaint.findById(req.params.id)
    .populate("assignedTo", "name _id")
    .populate("complainer", "name _id")
    .populate("category", "name _id");
  if (!complaint)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaint);
});

router.get("/generateReport/:companyId/:from/:to", async (req, res) => {
  try {
    const allComplaints = await Complaint.find({
      companyId: req.params.companyId
    });

    let from = new Date(req.params.from);
    let to = new Date(req.params.to);
    let complaints = [];
    let resolved = 0,
      spam = 0,
      inProgress = 0;

    allComplaints.forEach(complaint => {
      let date = new Date(complaint.timeStamp);
      if (from.getTime() <= date.getTime() && date.getTime() <= to.getTime()) {
        complaints.push(complaint);
        if (complaint.spam) {
          spam++;
        } else {
          if ((complaint.status = "in-progress")) inProgress++;
          else resolved++;
        }
      }
    });

    const pdfDoc = new PDFDocument();
    const reportName = "report" + Date.now() + ".pdf";

    const pdfPath = path.join("public", "files", "reports", reportName);

    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(20).text("Complaints' Report");

    pdfDoc.moveDown();

    pdfDoc
      .fontSize(12)
      .text(
        "Respected Sir, it is stated that we have prepared a report based on the number of complaints that are marked spam by the Assignee, resolved complaints and those who are in yet in-progress."
      );
    pdfDoc.text(" ");
    pdfDoc.text(
      "We have generated this report just to let you know the overall situation in the organization."
    );
    pdfDoc.text(" ");
    pdfDoc.text(`This data is from ${req.params.from} to ${req.params.to} `);
    pdfDoc.moveDown();

    pdfDoc.fontSize(15).text(`Total Complaints: ${complaints.length} `);
    pdfDoc
      .fillColor("red")
      .fontSize(12)
      .text(`Spam Complaints: ${spam} `);
    pdfDoc.fillColor("green").text(`Resolved Complaints: ${resolved} `);
    pdfDoc.text(`In Progress Complaints: ${inProgress} `);

    pdfDoc.fillColor("black").text("Regards", { align: "right" });

    pdfDoc.text("Management Team", { align: "right" });
    pdfDoc.moveDown();

    const date = new Date();
    const todayDate = date.getDate();
    const year = date.getFullYear();

    pdfDoc.fontSize(12).text(
      `${date.toLocaleString("default", {
        month: "long"
      })} ${todayDate}th,  ${year}`,
      {
        align: "right"
      }
    );

    pdfDoc.end();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + reportName + '"'
    );
    res
      .header("filename", pdfPath)
      .header("access-control-expose-headers", "filename");
  } catch (error) {
    return res.send(error);
  }
});

// task assignment to assignee
router.put(
  "/assigned/:complaintId/:assigneeId",
  authAdmin,
  async (req, res) => {
    const complaint = await Complaint.findById(req.params.complaintId);

    complaint.assigned = true;
    complaint.assignedTo = { _id: req.params.assigneeId };
    try {
      let notification = new Notification({
        msg: `You have been assigned with new complaint`,
        receivers: {
          role: "",
          id: complaint.assignedTo._id
        },
        companyId: "123",
        complaintId: complaint._id
      });
      await complaint.save();
      await notification.save();

      console.log("Task Assigned - admin");

      const upcmp = await Complaint.findById(req.params.complaintId)
        .populate("assignedTo", "name _id")
        .populate("complainer", "name _id")
        .populate("category", "name _id");

      io.getIO().emit("complaints", {
        action: "task assigned",
        complaint: complaint
      });
      console.log("Task Assigned - admin");

      res.status(200).send(upcmp);
    } catch (error) {
      res.status(500).send("Error occured", error);
    }
  }
);

module.exports = router;
