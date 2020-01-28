const encrypt = require("./../common/encrypt");
const { capitalizeFirstLetter } = require("./../common/helper");
const { SuperAdmin, validate } = require("../models/superAdmin");
const { Complainer } = require("../models/complainer");
const { Assignee } = require("../models/assignee");
const passwordGenrator = require("./../middleware/passwordGenerator");
const fs = require("fs");
const path = require("path");
const deleteFile = require("./../common/deleteFile");
const authUser = require("./../middleware/authUser");
const isSuperAdmin = require("./../middleware/isSuperAdmin");

const express = require("express");
const router = express.Router();
const _ = require("lodash");

const sendEmail = require("../common/sendEmail");
const { getEmailOptions } = require("../common/sendEmail");
const multer = require("multer");
const {
  executePagination,
  prepareFilter
} = require("../middleware/pagination");

const uploadImage = require("./../middleware/uploadImage");

const multerStorage = multer.memoryStorage();

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

router.get("/:id", async (req, res) => {
  let superAdmin = await SuperAdmin.findOne({ _id: req.params.id });
  if (!superAdmin) return res.status(404).send("User with given id not found.");
  res.send(superAdmin);
});

router.get(
  "/paginated/:pageNo/:pageSize",
  authUser,
  prepareFilter,
  executePagination(SuperAdmin)
);

//search user by email
// body must have email,companyId && role
router.post("/user/search", async (req, res) => {
  let Modal = {
    complainer: Complainer,
    superAdmin: SuperAdmin,
    assignee: Assignee
  };
  let { role, email, companyId } = req.body;
  let user = await Modal[role].findOne({
    email: email,
    companyId: companyId
  });
  if (!user) return res.status(404).send("User with given id not found.");
  res.send(_.pick(user, ["_id", "name", "email", "profilePicture"]));
});

//body must have companyId to create SuperAdmin
router.post(
  "/",
  upload.single("profilePicture"),
  passwordGenrator,
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let superAdmin = await SuperAdmin.findOne({
      email: req.body.email.toLowerCase()
    });

    if (superAdmin) return res.status(400).send("User already registered.");

    superAdmin = new SuperAdmin({
      name: capitalizeFirstLetter(req.body.name),
      email: req.body.email.toLowerCase(),
      password: req.body.password
    });

    if (req.body.mobileFile) {
      let buff = Buffer.from(req.body.mobileFile, "base64");
      let filename = `cmp-${req.complainer._id}-${Date.now()}.png`;
      let filePath = path.join("profilePictures", filename);

      superAdmin.set("profilePicture", buff);
      superAdmin.set("profilePath", filePath);
    } else if (req.file) {
      superAdmin.set("profilePath", req.file.filename);
      superAdmin.set("profilePicture", fs.readFileSync(req.file.path));
    }

    // const salt = await bcrypt.genSalt(10);
    // superAdmin.password = await bcrypt.hash(superAdmin.password, salt);
    const options = getEmailOptions(
      superAdmin.email,
      req.get("origin"),
      superAdmin.password,
      "Registration of Account Confirmation",
      "superAdmin"
    );

    superAdmin.password = encrypt(superAdmin.password);
    console.log(superAdmin);
    await superAdmin.save();
    if (req.file) deleteFile(req.file.path);
    res.send(_.pick(superAdmin, ["_id", "name", "email"]));
    sendEmail(options);
  }
);

router.put(
  "/:id",
  upload.single("profilePicture"),
  authUser,
  isSuperAdmin,
  uploadImage,
  async (req, res) => {
    let superAdmin = await SuperAdmin.findById(req.params.id);
    if (!superAdmin)
      return res
        .status(404)
        .send("The superAdmin with the given ID was not found.");

    console.log("req body", req.body);

    superAdmin = await SuperAdmin.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.send(superAdmin);
    if (req.file) deleteFile(req.file.path);
  }
);

module.exports = router;

// /api/complainers
