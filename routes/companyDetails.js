const { CompanyDetail, validate } = require("../models/companyDetail");
const express = require("express");
const fs = require("fs");
const router = express.Router();
const _ = require("lodash");
const authUser = require("./../middleware/authUser");
const isAdmin = require("./../middleware/isAdmin");
const readCsv = require("./../middleware/readCsv");
const sendCsvToClient = require("./../common/sendCsv");
const deleteFile = require("./../common/deleteFile");
const getCategoryByName = require("./../common/categoriesHelper");
const multer = require("multer");
const encrypt = require("./../common/encrypt");
const sendEmail = require("../common/sendEmail");
const { getEmailOptions } = require("../common/sendEmail");
// multer storageor
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
  const assignees = await CompanyDetail.find();

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

//getting companyDetailForm based on his/her _id
router.get("/me/:id", async (req, res) => {
  const assignees = await CompanyDetail.findOne({ _id: req.params.id });

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

router.get("/:id", async (req, res) => {
  const companyDetailForm = await CompanyDetail.findOne({ _id: req.params.id });

  if (!companyDetailForm)
    return res.status(404).send("There is no CompanyDetail with given Id.");

  res.status(200).send(companyDetailForm);
});

router.get("/email/:email", async (req, res) => {
  const companyDetailForm = await CompanyDetail.findOne({
    email: req.params.email
  });

  if (!companyDetailForm)
    return res.status(404).send("There is no CompanyDetail with given Id.");

  res.send(
    _.pick(companyDetailForm, ["_id", "name", "email", "profilePicture"])
  );
});

router.post(
  "/",
  authUser,
  isAdmin,
  upload.single("profilePicture"),
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    companyDetailForm = new CompanyDetail({
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone
    });

    if (req.file) {
      companyDetailForm.set("profilePath", req.file.filename);
      companyDetailForm.set("profilePicture", fs.readFileSync(req.file.path));
    }
    await companyDetailForm.save();
    res.send(companyDetailForm);
  }
);

//Route which handles CSV files
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

    //create accounts for each entry
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      const tempArray = user.responsibilities;
      if (user.responsibilities) {
        const userResponsibilities = user.responsibilities.split(">");
        const responsibilities = [];
        //fetch categories objects into responsibities
        for (let index = 0; index < userResponsibilities.length; index++) {
          const categoryName = userResponsibilities[index].trim();
          const result = await getCategoryByName(categoryName);
          if (result) {
            responsibilities.push(result);
          }
        }
        user.responsibilities = responsibilities;
      }
      console.log("user after responsibilities", user);
      const { error } = validate(user);
      if (error) {
        delete user.password;
        user.responsibilities = tempArray;
        user.message = error.details[0].message;
        errors.push(user);
        continue;
      }

      let companyDetailForm = await CompanyDetail.findOne({
        email: user.email
      });
      if (companyDetailForm) {
        delete user.password;
        user.responsibilities = tempArray;

        user.message = "User Already exists";
        errors.push(user);
        continue;
      }

      companyDetailForm = new CompanyDetail(
        _.pick(user, ["name", "email", "password", "phone", "responsibilities"])
      );
      // const salt = await bcrypt.genSalt(10);
      // companyDetailForm.password = await bcrypt.hash(companyDetailForm.password, salt);
      const options = getEmailOptions(
        companyDetailForm.email,
        req.get("origin"),
        companyDetailForm.password,

        "Registration of Account Confirmation",
        "companyDetailForm"
      );
      companyDetailForm.password = encrypt(companyDetailForm.password);
      await companyDetailForm.save();
      sendEmail(options);
    }
    sendCsvToClient(req, res, errors);
    if (req.file) deleteFile(req.file.path);
  }
);

router.put("/:id", upload.single("profilePicture"), async (req, res) => {
  // const { error } = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);
  let companyDetailForm = await CompanyDetail.findById(req.params.id);
  if (!companyDetailForm)
    return res
      .status(404)
      .send("The companyDetailForm with the given ID was not found.");
  console.log("req file", req.file);
  console.log("req body", req.body);
  const profilePath = req.file ? req.file.path : req.body.profilePath;
  const updatedUser = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    responsibilities: JSON.parse(req.body.responsibilities),
    profilePath: profilePath,
    profilePicture: companyDetailForm.profilePicture
  };
  if (req.file) {
    updatedUser.profilePicture = fs.readFileSync(req.file.path);
  }

  companyDetailForm = await CompanyDetail.findByIdAndUpdate(
    req.params.id,
    updatedUser,
    {
      new: true
    }
  );
  res.send(companyDetailForm);
  if (req.file) deleteFile(req.file.path);
});

router.put("/change/chatwith/messages/:assigneeId/:id", async (req, res) => {
  const companyDetailForm = await CompanyDetail.findOne({
    _id: req.params.assigneeId
  });

  if (!companyDetailForm)
    return res.status(404).send("No CompanyDetail found.");

  companyDetailForm.chatWith = req.params.id;

  await companyDetailForm.save();

  res.send(companyDetailForm);
});

//kindly correct this route
//******************************************** */
// getting companyDetailForm based on responsbility
// router.get("/:id", async (req, res) => {
//   const assignees = await CompanyDetail.find({ responsibilities: req.params.id });

//   if (!assignees) return res.status(404).send("There are no Assignees.");

//   res.status(200).send(assignees);
// });

router.delete("/:id", async (req, res) => {
  const companyDetailForm = await CompanyDetail.findByIdAndRemove(
    req.params.id
  );

  if (!companyDetailForm)
    return res.status(404).send("CompanyDetail with given ID Not Found.");

  res.status(200).send(companyDetailForm);
});

//

module.exports = router;
