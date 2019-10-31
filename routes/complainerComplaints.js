const fs = require("fs");
const mime = require("mime");
const path = require("path");
const { Complaint, validate } = require("../models/complaint");
const { Category } = require("../models/category");
const { Assignee } = require("../models/assignee");
const { Complainer } = require("../models/complainer");
const { Admin } = require("../models/admin");
const checkSeverity = require("../utils/severity");
const authComplainer = require("../middleware/authComplainer");
const io = require("../socket");
const express = require("express");
const multer = require("multer");
const router = express.Router();
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

// multer filter
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Only images are allowed", false);
  }
};

// multer upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// complainer can find only his complaints -- Complainer
router.get("/", authComplainer, async (req, res) => {
  const complaints = await Complaint.find({
    complainer: req.complainer._id
  })
    // .populate('complainer', 'name -_id')
    // .populate('assignedTo', 'name -_id')
    .select("_id title status")
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
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    const severity = checkSeverity(req.body.details);
    const category = await Category.findById(req.body.categoryId);
    if (!category) return res.status(400).send("Invalid category.");
    console.log(category._id);

    const assignee = await Assignee.findOne({
      "responsibilities._id": category._id.toString()
    });
    console.log("Assignee", assignee);
    let adminAssignee = null;
    if (!assignee) {
      adminAssignee = await Admin.findOne().limit(1);
    }

    const complainer = await Complainer.findById(req.complainer._id);
    if (!complainer) return res.status(400).send("Invalid Complainer.");

    const title = req.body.title.toLowerCase();

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
      geolocation: req.body.geolocation ? req.body.geolocation : "",
      details: req.body.details,
      title: title,
      location: req.body.location,
      severity: severity,
      files: req.file ? req.file.filename : ""
    });

    await complaint.save();

    io.getIO().emit("complaints", {
      action: "new complaint",
      complaint: complaint
    });
    console.log("new complaint - complainer");

    res.send(complaint);

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
  }
);

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
      return res.status(404).send("Not image found with this Complaint.");
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
    res.status(404).send("Could not find image.");
  }
});

// fetching up complaint's picture
router.get("/view/image/:id", async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).send("The complaint with given ID was not found.");
    } else if (!complaint.files) {
      return res.status(404).send("Not image found with this Complaint.");
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
    res.status(404).send("Could not find image.");
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

  await complaint.save();

  io.getIO().emit("complaints", { action: "feedback", complaint: complaint });
  console.log("feedback given complaint - assignee");
  res.send(complaint);
});

// getting all spam complaints for charts and graphs
router.get("/get/all/spam", async (req, res) => {
  const complaints = await Complaint.find({ spam: true }).select("timeStamp");
  if (!complaints)
    return res
      .status(404)
      .send("The complaint with the given ID was not found.");

  res.send(complaints);
});

// getting all progress complaints for charts and graphs
router.get("/get/all/progress", async (req, res) => {
  const complaints = await Complaint.find({ status: "in-progress" }).select(
    "timeStamp"
  );
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
    .select(
      "_id title status location spam details files remarks timeStamp feedbackRemarks feedbackTags"
    )
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
