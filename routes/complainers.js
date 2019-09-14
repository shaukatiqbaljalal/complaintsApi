const encrypt = require("./../common/encrypt");

const { Complainer, validate } = require("../models/complainer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const passwordGenerator = require("./../middleware/passwordGenerator");
const readCsv = require("./../middleware/readCsv");
const sendCsvToClient = require("./../common/sendCsv");
const deleteFile = require("./../common/deleteFile");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const fs = require("fs");
const multer = require("multer");
const { getEmailOptions } = require("../common/sendEmail");
const sendEmail = require("../common/sendEmail");

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

router.get("/all", async (req, res) => {
  const complainers = await Complainer.find();

  if (!complainers) return res.status(404).send("There is no complainer.");

  res.status(200).send(complainers);
});

router.get("/:id", async (req, res) => {
  const complainer = await Complainer.findOne({ _id: req.params.id });

  if (!complainer) return res.status(404).send("There are no complainer.");
  res.status(200).send(complainer);
});

router.get("/email/:email", async (req, res) => {
  const complainer = await Complainer.findOne({ email: req.params.email });

  if (!complainer) return res.status(404).send("There are no complainer.");
  res.send(_.pick(complainer, ["_id", "name", "email", "profilePicture"]));
});
router.post(
  "/",
  upload.single("profilePicture"),
  passwordGenerator,
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let complainer = await Complainer.findOne({ email: req.body.email });

    if (complainer) return res.status(400).send("User already registered.");

    complainer = new Complainer(
      _.pick(req.body, ["name", "email", "password", "phone"])
    );
    if (req.file) {
      complainer.set("profilePath", req.file.filename);
      complainer.set("profilePicture", fs.readFileSync(req.file.path));
    }
    const options = getEmailOptions(
      complainer.email,
      req.get("origin"),
      complainer.password,
      "Registration of Account Confirmation",
      "complainer"
    );
    console.log("Created Complainer object", complainer);
    // const salt = await bcrypt.genSalt(10);
    // complainer.password = await bcrypt.hash(complainer.password, salt);
    complainer.password = encrypt(complainer.password);

    await complainer.save();
    res.send(_.pick(complainer, ["_id", "name", "email"]));
    sendEmail(options);
  }
);

// router.post("/user", upload.single("profilePicture"), async (req, res) => {
//   console.log(req.file);
//   req.body.profilePath = req.file.path;
//   res.send(req.body);
// });

//This route only handles csv files
router.post(
  "/uploadCsv",
  upload.single("csvFile"),
  readCsv,
  async (req, res) => {
    if (req.error) {
      res.status(400).send(req.error);
    }
    let errors = [];
    let users = req.users;

    //delete file from server
    deleteFile(req.file.path);
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      const { error } = validate(user);
      if (error) {
        delete user.password;
        user.message = error.details[0].message;
        errors.push(user);
        continue;
      }

      let complainer = await Complainer.findOne({ email: user.email });
      if (complainer) {
        delete user.password;
        user.message = "User Already exists";
        errors.push(user);
        continue;
      }

      complainer = new Complainer(
        _.pick(user, ["name", "email", "password", "phone"])
      );
      // const salt = await bcrypt.genSalt(10);
      // complainer.password = await bcrypt.hash(complainer.password, salt);
      const options = getEmailOptions(
        complainer.email,
        req.get("origin"),
        complainer.password,
        "Registration of Account Confirmation",
        "complainer"
      );
      complainer.password = encrypt(complainer.password);
      await complainer.save();
      sendEmail(options);
    }
    sendCsvToClient(req, res, errors);
  }
);

router.put("/:id", upload.single("profilePicture"), async (req, res) => {
  // const { error } = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);
  let complainer = await Complainer.findOne({ email: req.body.email });
  if (complainer && complainer._id != req.params.id)
    return res.status(400).send("email already registered");
  const profilePath = req.file ? req.file.path : req.body.profilePath;
  let profilePicture = null;
  if (req.file) profilePicture = fs.readFileSync(req.file.path);
  complainer = await Complainer.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      profilePath: profilePath,
      profilePicture: profilePicture
    },
    { new: true }
  );

  if (!complainer)
    return res
      .status(404)
      .send("The complainer with the given ID was not found.");

  res.send(complainer);
});

router.delete("/:id", async (req, res) => {
  const complainer = await Complainer.findByIdAndRemove(req.params.id);

  if (!complainer)
    return res.status(404).send("There is no complainer with give ID.");

  res.status(200).send(complainer);
});

writeErrorsInCsv = function(filePath, errors) {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: "name", title: "name" },
      { id: "email", title: "email" },
      { id: "phone", title: "phone" }
    ]
  });
  let users = [];
  errors.forEach(error => {
    users.push(error.user);
  });
  console.log(users);
  csvWriter
    .writeRecords(users)
    .then(() => console.log("The CSV file was written successfully"));
};

module.exports = router;

// /api/complainers
