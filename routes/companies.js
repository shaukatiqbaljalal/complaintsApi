const { Company, validate } = require("../models/company");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const multer = require("multer");
const fs = require("fs");
// multer storage
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = "./profilePictures";
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `cmp-${Date.now()}-${file.originalname}`);
  }
});

// multer filter
const multerFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
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

router.get("/", async (req, res) => {
  let companies = await Company.find();
  if (!companies.length) return res.status(404).send("Companies Not Found");
  return res.send(companies);
});

router.get("/:id", async (req, res) => {
  let company = await Company.findById(req.params.id);
  if (!company) return res.status(404).send("Company Not Found");
  return res.send(company);
});

router.post("/", upload.single("profilePicture"), async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  if (req.file) {
    req.body.profilePath = req.file.filename;
    req.body.profilePicture = fs.readFileSync(req.file.path);
  }

  // let regex = new RegExp(req.body.name, "i");
  let company = await Company.findOne({
    name: { $regex: `^${req.body.name}$`, $options: "i" }
  });

  if (company)
    return res.status(400).send("Company with given name already exists");
  company = new Company(req.body);
  try {
    await company.save();
    res.send(company);
  } catch (error) {
    res.status(500).send("COuld not stode company details", error);
  }
});

router.put("/:id", upload.single("profilePicture"), async (req, res) => {
  // const { error } = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);
  let company = await Company.findById(req.params.id);
  if (!company)
    return res.status(404).send("The company with the given ID was not found.");
  console.log("req body", req.body);
  const profilePath = req.file ? req.file.path : req.body.profilePath;

  req.body.profilePath = profilePath;
  req.body.profilePicture = company.profilePicture;
  if (req.file) {
    req.body.profilePicture = fs.readFileSync(req.file.path);
  }
  try {
    company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.send(company);
    if (req.file) deleteFile(req.file.path);
  } catch (error) {
    res.status(500).send("Some error occured", error);
    if (req.file) deleteFile(req.file.path);
  }
});
module.exports = router;
