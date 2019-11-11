const { Company, validate } = require("../models/company");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
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
  //   const { error } = validate(req.body);
  //   if (error) {
  //     return res.send(error.details[0].message);
  //   }
  let company = await Company.findById(req.params.id);
  if (!company) return res.status(404).send("Company Not Found");
  return res.send(company);
});
router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  const company = Company(req.body);
  try {
    await company.save();
    return res.send(company);
  } catch (error) {
    return res.status(400).send(error);
  }
});
router.get("/", async (req, res) => {
  let company = await Company.find();
  if (!company) return res.status(404).send("Company Not Found");
  return res.send(company);
});
module.exports = router;
