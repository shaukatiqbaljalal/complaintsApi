const fs = require("fs");
const mime = require("mime");
const path = require("path");
const { Complaint, validate } = require("../models/complaint");
const { Category } = require("../models/category");
const { Assignee } = require("../models/assignee");
// const { Configuration } = require("../models/configuration");
const { Complainer } = require("../models/complainer");
const { Admin } = require("../models/admin");
const checkSeverity = require("../utils/severity");
const authComplainer = require("../middleware/authComplainer");
const io = require("../socket");
const express = require("express");
const multer = require("multer");
const router = express.Router();
const { AttachmentType } = require("../models/attachment");
const capitalizeFirstLetter = require("./../common/helper");
const authUser = require("./../middleware/authUser");
const _ = require("lodash");

// multer storage
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/files/complaints");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `cmp-${req.complainer._id}-${Date.now()}.${ext}`);
  }
});

// // multer filter
// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image")) {
//     cb(null, true);
//   } else {
//     cb("Only images are allowed", false);
//   }
// };

// multer upload
const upload = multer({
  storage: multerStorage
  // fileFilter: multerFilter
});

// complainer can find only his complaints -- Complainer
router.get("/", authComplainer, async (req, res) => {
  const complaints = await Complaint.find({
    complainer: req.complainer._id
  })
    .populate("complainer", "name _id")
    .populate("assignedTo", "name _id")
    .populate("category", "name _id");

  res.send(complaints);
});

// configuring multer for files
// const upload = multer({
//   limits: {
//     fileSize: 1000000
//   },
//   fileFilter(req, file, cb) {
//     if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
//       return cb(new Error("File must be .jpg | .jpeg | .png"));
//     }
//     cb(undefined, true);
//   }
// });

// complainer can make complaint -- Complainer
router.post(
  "/",
  authComplainer,
  upload.single("complaint"),
  async (req, res) => {
    console.log(req.body);
    if (!req.body.companyId) req.body.companyId = req.complainer.companyId;
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    // Validate the attached file is allowed
    if (req.file) {
      let attachments = await AttachmentType.find({
        companyId: req.body.companyId
      }).select("extentionName maxSize");

      let ext = req.file.mimetype.split("/")[1].toLowerCase();
      if (!attachments.length)
        return res.status(400).send("Attachment is not allowed");
      let type = attachments.find(a => a.extentionName === ext);
      if (!type)
        return res.status(400).send("The attached file is not allowed");
      if (req.file.size / 1024 > +type.maxSize)
        return res
          .status(400)
          .send("The attached file is larger than allowed size.");
    }
    console.log(req.body, "Body");
    let severity;
    if (!req.body.severity) {
      console.log("if");
      severity = checkSeverity(req.body.details);
    } else {
      switch (+req.body.severity) {
        case 1:
          severity = "Low";
          break;
        case 2:
          severity = "Medium";
          break;
        case 3:
          severity = "High";
          break;
        default:
          severity = "Low";
          break;
      }
      console.log("else");
    }

    const category = await Category.findById(req.body.categoryId);
    if (!category) return res.status(400).send("Invalid category.");

    const assignees = await Assignee.find({
      "responsibilities._id": category._id.toString()
    }).select("name");
    // console.log('assignees',assignees);
    console.log("Assignees", assignees);
    let adminAssignee = null;
    let assignee;
    if (assignees.length < 1) {
      adminAssignee = await Admin.findOne({
        companyId: req.body.companyId
      });
    } else {
      let countArr = [];
      for (let index = 0; index < assignees.length; index++) {
        const a = assignees[index];
        let complaints = await Complaint.find({
          assignedTo: a._id
        }).count((err, count) => {
          countArr.push(count);
        });
      }
      console.log(countArr, "Count array");
      let index = countArr.indexOf(Math.min(...countArr));
      console.log("index", index);
      if (index >= 0) assignee = assignees[index];
      else assignee = assignees[0];
    }
    console.log(assignee);
    // return;
    const complainer = await Complainer.findById(req.complainer._id);
    if (!complainer) return res.status(400).send("Invalid Complainer.");

    const title = capitalizeFirstLetter(req.body.title);
    const location = {
      lat: req.body.latitude,
      lng: req.body.longitude
    };
    console.log(location);
    let complaint = new Complaint({
      category: {
        _id: category._id
      },
      complainer: {
        _id: complainer._id
      },
      assignedTo: {
        _id: assignee ? assignee._id : adminAssignee._id
      },
      assigned: assignee ? true : false,
      geolocation: location ? location : "",
      details: req.body.details,
      title: title,
      location: req.body.location,
      severity: severity,
      files: req.file ? req.file.filename : "",
      companyId: req.body.companyId,
      remarks: []
    });
    console.log(complaint);
    try {
      await complaint.save();
      let newUp = await Complaint.findById(complaint._id)
        .populate("complainer", "name _id")
        .populate("assignedTo", "name _id")
        .populate("category", "name _id");

      io.getIO().emit("complaints", {
        action: "new complaint",
        complaint: newUp
      });
      console.log("new complaint - complainer");

      res.send(newUp);
    } catch (error) {
      res.status(500).send("Some error occured while fetching file", e);
    }
  }
);

// // <------Assigning complaint to ASSIGNEE afteer specified time------->
// const assignee = await Assignee.findOne({
//   responsibility: complaint.category
// });
// if (!assignee)
//   return res
//     .status(404)
//     .send("Invalid Assignee. Assignee with given ID was not found.");

// setTimeout(async () => {
//   complaint = await Complaint.findOneAndUpdate(
//     { _id: complaint._id },
//     { assigned: true, assignedTo: assignee._id },
//     { new: true }
//   );
//   await complaint.save();
//   res.send(complaint);
// }, 5000);
// <-------getting the latest record from database------->
// let complaint = await Complaint.findOne()
//   .limit(1)
//   .sort({ $natural: -1 })
//   .select('-image');
// if (!complaint) return;
// if (complaint.assigned == true) return;

// console.log(complaint);
// <-------getting the latest record from database------->

// fetching up complaint's picture
router.get("/download/image/:id", async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).send("The complaint with given ID was not found.");
    } else if (!complaint.files) {
      return res.status(404).send("Not file found with this Complaint.");
    }

    const fileExtension = complaint.files.split(".")[1];

    const filePath = path.join(
      "public",
      "files",
      "complaints",
      complaint.files
    );
    fs.readFile(filePath, (err, data) => {
      if (err) return next(err);

      res.setHeader("Content-Type", mime.getType(fileExtension));
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + complaint.files + '"'
      );
      res.send(data);
    });
  } catch (e) {
    res.status(500).send("Some error occured while fetching file", e);
  }
});

// fetching up complaint's picture
router.get("/view/image/:id", async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).send("The complaint with given ID was not found.");
    } else if (!complaint.files) {
      return res.status(404).send("Not file found with this Complaint.");
    }

    const filePath = path.join(
      "public",
      "files",
      "complaints",
      complaint.files
    );

    fs.readFile(filePath, (err, data) => {
      if (err) return next(err);
      res.setHeader(
        "Content-Type",
        mime.getType(complaint.files.split(".")[1])
      );
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + complaint.files + '"'
      );
      res.send(data);
    });
  } catch (e) {
    res.status(404).send("Could not find file.");
  }
});

// Complainer give feedback on certain complaint -- Complainer
router.put("/feedback/:id", authComplainer, async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id });

  if (!complaint)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  complaint.feedbackRemarks = req.body.feedbackRemarks;

  if (req.body.feedbackTags === "no") {
    complaint.feedbackTags = "not satisfied";
  } else {
    complaint.feedbackTags = "satisfied";
  }
  try {
    await complaint.save();
    const newUp = await Complaint.findOne({ _id: req.params.id })
      .populate("complainer", "name _id")
      .populate("assignedTo", "name _id")
      .populate("category", "name _id");

    io.getIO().emit("complaints", { action: "feedback", complaint: newUp });
    console.log("feedback given complaint - assignee");

    res.send(newUp);
  } catch (error) {
    res.status(404).send("Could not find file.");
  }
});

// getting all spam complaints for charts and graphs
router.get("/get/all/spam", authUser, async (req, res) => {
  const complaints = await Complaint.find({
    spam: true,
    companyId: req.user.companyId
  }).select("timeStamp");
  if (!complaints)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaints);
});

// getting all progress complaints for charts and graphs
router.get("/get/all/progress", authUser, async (req, res) => {
  const complaints = await Complaint.find({
    status: "in-progress",
    companyId: req.user.companyId
  }).select("timeStamp");
  if (!complaints)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaints);
});

// getting all resolved complaints for charts and graphs
router.get("/get/all/resolved", async (req, res) => {
  const complaints = await Complaint.find({
    status: { $ne: "in-progress" }
  }).select("timeStamp");
  if (!complaints)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaints);
});

// Complainer can get any complaint by ID -- Complainer
router.get("/:id", async (req, res) => {
  const complaint = await Complaint.findOne({
    _id: req.params.id
  })
    .populate("complainer", "name _id")
    .populate("assignedTo", "name _id")
    .populate("category", "name _id");

  if (!complaint)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaint);
});

module.exports = router;
