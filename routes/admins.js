const encrypt = require("./../common/encrypt");
const capitalizeFirstLetter = require("./../common/helper");
const { Company } = require("../models/company");
const { Admin, validate } = require("../models/admin");
const { Complainer } = require("../models/complainer");
const { Assignee } = require("../models/assignee");
const passwordGenrator = require("./../middleware/passwordGenerator");
const fs = require("fs");
const path = require("path");
const deleteFile = require("./../common/deleteFile");
const authUser = require("./../middleware/authUser");

const express = require("express");
const router = express.Router();
const _ = require("lodash");

const sendEmail = require("../common/sendEmail");
const { getEmailOptions } = require("../common/sendEmail");
const multer = require("multer");
// multer storage
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest =
      file.mimetype === "application/vnd.ms-excel"
        ? "./csvFiles"
        : "./profilePictures";
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `cmp-${Date.now()}-${file.originalname}`);
  }
});

// multer filter
const multerFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true);
  } else {
    cb("Only images or csv files allowed", false);
  }
};

// multer upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

router.get("/:id", async (req, res) => {
  try {
    let admin = await Admin.findOne({ _id: req.params.id });
    if (!admin) return res.status(404).send("User with given id not found.");
    res.send(admin);
  } catch (error) {
    res.send(error);
  }
});

//search user by email
// body must have email,companyId && role
router.post("/user/search", async (req, res) => {
  console.log(req.body);
  let user;
  switch (req.body.role) {
    case "admin":
      user = await Admin.findOne({
        email: req.body.email,
        companyId: req.body.companyId
      });
      break;
    case "complainer":
      user = await Complainer.findOne({
        email: req.body.email,
        companyId: req.body.companyId
      });
      break;
    case "assignee":
      user = await Assignee.findOne({
        email: req.body.email,
        companyId: req.body.companyId
      });
      break;
    default:
      return res.status(400).send("Role must be complaine,admin or assignee");
  }

  if (!user) return res.status(404).send("User with given id not found.");
  res.send(_.pick(user, ["_id", "name", "email", "profilePicture"]));
});

//body must have companyId to create Admin
router.post(
  "/",
  upload.single("profilePicture"),
  passwordGenrator,
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let company = await Company.findById(req.body.companyId);
    if (!company) return res.status(400).send("Company Not exists");

    let admin = await Admin.findOne({
      email: req.body.email.toLowerCase(),
      companyId: req.body.companyId
    });

    if (admin) return res.status(400).send("User already registered.");

    admin = new Admin({
      name: capitalizeFirstLetter(req.body.name),
      email: req.body.email.toLowerCase(),
      password: req.body.password,
      phone: req.body.phone,
      companyId: req.body.companyId
    });

    if (req.body.mobileFile) {
      let buff = Buffer.from(req.body.mobileFile, "base64");
      let filename = `cmp-${req.complainer._id}-${Date.now()}.png`;
      let filePath = path.join("profilePictures", filename);

      assignee.set("profilePicture", buff);
      assignee.set("profilePath", filePath);
    }

    if (req.file) {
      admin.set("profilePath", req.file.filename);
      admin.set("profilePicture", fs.readFileSync(req.file.path));
    }

    // const salt = await bcrypt.genSalt(10);
    // admin.password = await bcrypt.hash(admin.password, salt);
    const options = getEmailOptions(
      admin.email,
      req.get("origin"),
      admin.password,
      "Registration of Account Confirmation",
      "admin"
    );
    admin.password = encrypt(admin.password);
    console.log(admin);
    await admin.save();
    if (req.file) deleteFile(req.file.path);
    res.send(_.pick(admin, ["_id", "name", "email"]));
    sendEmail(options);
  }
);

router.put("/:id", upload.single("profilePicture"), async (req, res) => {
  // const { error } = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);
  let admin = await Admin.findById(req.params.id);
  if (!admin)
    return res.status(404).send("The admin with the given ID was not found.");
  console.log("req body", req.body);
  const profilePath = req.file ? req.file.path : req.body.profilePath;

  req.body.profilePath = profilePath;
  req.body.profilePicture = admin.profilePicture;
  if (req.file) {
    req.body.profilePicture = fs.readFileSync(req.file.path);
  }

  if (req.body.mobileFile) {
    let buff = Buffer.from(req.body.mobileFile, "base64");

    let filename = `cmp-${req.user._id}-${Date.now()}.png`;
    let filePath = path.join("profilePictures", filename);

    req.body.profilePath = filePath;
    req.body.profilePicture = buff;
  }
  try {
    admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.send(admin);
    if (req.file) deleteFile(req.file.path);
  } catch (ex) {
    console.log(ex);
  }
});

module.exports = router;

// /api/complainers
