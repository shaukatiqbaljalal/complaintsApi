const { User, validate } = require("../models/user");
const { Company } = require("../models/company");
const express = require("express");
const fs = require("fs");
const router = express.Router();
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const passwordGenerator = require("./../middleware/passwordGenerator");
const readCsv = require("./../middleware/readCsv");
const sendCsvToClient = require("./../common/sendCsv");
const deleteFile = require("./../common/deleteFile");
const getCategoryByName = require("./../common/categoriesHelper");
const multer = require("multer");
const encrypt = require("./../common/encrypt");
const sendEmail = require("../common/sendEmail");
const { getEmailOptions } = require("../common/sendEmail");
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

router.post("/", async (req, res) => {
  //   const { error } = validate(req.body);
  //   if (error) {
  //     return res.send(error.details[0].message);
  //   }
  console.log(req.body.id);
  let company = await Company.findById(req.body.id);
  if (!company) return res.status(404).send("Company Not Found");
  return res.send(company);
});

router.get("/", async (req, res) => {
  let company = await Company.find();
  if (!company) return res.status(404).send("Company Not Found");
  return res.send(company);
});
module.exports = router;
