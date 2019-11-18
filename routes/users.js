const { User, validate } = require("../models/user");
const authUser = require("../middleware/authUser");
const isAuthorized = require("../middleware/isAuthorized");
const validateCompany = require("../middleware/validateCompany");
const { Company } = require("../models/company");
const express = require("express");
const fs = require("fs");
const router = express.Router();
const _ = require("lodash");
const passwordGenerator = require("./../middleware/passwordGenerator");
const multer = require("multer");
const encrypt = require("./../common/encrypt");
const sendEmail = require("../common/sendEmail");
const { getEmailOptions } = require("../common/sendEmail");

const decrypt = require("../common/decrypt");

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

router.get("/:id", authUser, async (req, res) => {
  const user = await User.findById(req.params.id);
  //   console.log(user);
  //   if (user.companyId !== req.user.companyId)
  //     return res.status(401).send("You are not authorized");
  //   if (!(req.user.role === "admin" && user.role === "agent"))
  //     return res.status(401).send("You are not authorized");
  //   if (!(req.user.role === "agent" && user.role === "customer"))
  //     return res.status(401).send("You are not authorized");
  if (!user) return res.status(404).send("user not found");
  return res.status(200).send(user);
});

router.get("/all/:role", async (req, res) => {
  let users = await User.find({ role: req.params.role });
  if (!users) return res.status(404).send("Users under given role Not Found");
  return res.send(users);
});

router.post(
  "/",
  upload.single("profilePicture"),
  authUser,
  isAuthorized,
  validateCompany,
  passwordGenerator,
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    //check if  company id is valid?
    let company = await Company.findOne({ _id: req.body.companyId });
    if (!company) return res.status(404).send("Company Id is not valid");
    //check [email && companyId] combination is not in the users table
    let user = await User.findOne({
      email: req.body.email,
      companyId: req.body.companyId
    });
    console.log("found user", user);
    if (user) return res.status(400).send("User already registered.");
    //create user object
    user = new User(req.body);
    if (req.file) {
      user.set("profilePath", req.file.filename);
      user.set("profilePicture", fs.readFileSync(req.file.path));
    }
    const options = getEmailOptions(
      user.email,
      req.get("origin"),
      user.password,
      "Registration of Account Confirmation",
      "user"
    );
    console.log("Created user object", user);
    // const salt = await bcrypt.genSalt(10);
    // user.password = await bcrypt.hash(user.password, salt);
    user.password = encrypt(user.password);

    try {
      await user.save();
      sendEmail(options);
      return res.send(
        _.pick(user, ["_id", "name", "email", "companyId", "role"])
      );
    } catch (error) {
      return res.send(error);
    }
  }
);

router.put(
  "/:id",
  upload.single("profilePicture"),
  authUser,
  isAuthorized,
  validateCompany,
  async (req, res) => {
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);
    let user = await User.findOne({
      email: req.body.email,
      companyId: req.body.companyId
    });
    if (user && user._id != req.params.id)
      return res.status(400).send("email already registered");
    const profilePath = req.file ? req.file.path : req.body.profilePath;
    let profilePicture = null;
    if (req.file) profilePicture = fs.readFileSync(req.file.path);
    req.body.profilePath = profilePath;
    req.body.profilePicture = profilePicture;
    user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!user)
      return res.status(404).send("The user with the given ID was not found.");

    res.send(user);
  }
);

router.put(
  "/profile/:id",
  upload.single("profilePicture"),
  authUser,
  validateCompany,
  async (req, res) => {
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);
    let user = await User.findOne({
      email: req.body.email,
      companyId: req.body.companyId
    });
    if (req.user._id === req.params.id)
      return res.status(401).send("You are not authorized");
    if (user && user._id != req.params.id)
      return res.status(400).send("email already registered");
    const profilePath = req.file ? req.file.path : req.body.profilePath;
    let profilePicture = null;
    if (req.file) profilePicture = fs.readFileSync(req.file.path);
    req.body.profilePath = profilePath;
    req.body.profilePicture = profilePicture;
    user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!user)
      return res.status(404).send("The user with the given ID was not found.");

    res.send(user);
  }
);

router.delete(
  "/:id",
  authUser,
  isAuthorized,
  validateCompany,
  async (req, res) => {
    console.log(req.body);
    const user = await User.findByIdAndRemove(req.params.id);

    if (!user)
      return res.status(404).send("There is no user with the given ID.");

    res.status(200).send(user);
  }
);

router.post("/recover", async (req, res) => {
  const { email, companyId } = req.body;
  let user = await User.findOne({ email: email, companyId: companyId });

  if (!user)
    return res.status(404).send("There is no user with given email address ");
  console.log(user);
  const password = decrypt(user.password);
  const options = {
    to: email,
    subject: "Password recovery",
    html: `<h3>Dear ${user.name}!</h3></h3><p>We hear that you have attempted for Reset/Forgot Password.<br/> Your account password is:${password}</p>`
  };

  res.send("Password has been sent to your email address");
  sendEmail(options);
});

router.put("/reset/password", authUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { email, companyId } = req.body;
  let user = await User.findOne({ email: email, companyId: companyId });

  if (!user) return res.status(404).send("There is no user with given email ");
  const oldPassword = decrypt(user.password);
  console.log(oldPassword);

  if (oldPassword !== currentPassword)
    return res
      .status(400)
      .send("Current Password is not valid. Please try again");
  if (newPassword === oldPassword) {
    return res.status(400).send("You have entered the old password again");
  }
  user.password = encrypt(newPassword);
  try {
    const updated = await user.save();
    console.log(updated);
    res.status(200).send("Password Successfully Updated");
  } catch (error) {
    res.send(error);
  }
});
module.exports = router;
