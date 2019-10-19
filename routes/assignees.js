const { Assignee, validate } = require("../models/assignee");
const express = require("express");
const fs = require("fs");
const router = express.Router();
const _ = require("lodash");
const passwordGenrator = require("./../middleware/passwordGenerator");
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
  const assignees = await Assignee.find();

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

//getting assignee based on his/her _id
router.get("/me/:id", async (req, res) => {
  const assignees = await Assignee.findOne({ _id: req.params.id });

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

router.get("/:id", async (req, res) => {
  const assignee = await Assignee.findOne({ _id: req.params.id });

  if (!assignee)
    return res.status(404).send("There is no Assignee with given Id.");

  res.status(200).send(assignee);
});

router.get("/email/:email", async (req, res) => {
  const assignee = await Assignee.findOne({ email: req.params.email });

  if (!assignee)
    return res.status(404).send("There is no Assignee with given Id.");

  res.send(_.pick(assignee, ["_id", "name", "email", "profilePicture"]));
});

router.post(
  "/",
  upload.single("profilePicture"),
  passwordGenrator,
  async (req, res) => {
    console.log();
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let assignee = await Assignee.findOne({ email: req.body.email });
    if (assignee) return res.status(400).send("User already registered.");

    assignee = new Assignee({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,

      phone: req.body.phone,
      responsibilities: JSON.parse(req.body.responsibilities)
    });
    if (req.file) {
      assignee.set("profilePath", req.file.filename);
      assignee.set("profilePicture", fs.readFileSync(req.file.path));
    }
    console.log(assignee);
    // const salt = await bcrypt.genSalt(10);
    // assignee.password = await bcrypt.hash(assignee.password, salt);

    assignee.password = encrypt(assignee.password);
    await assignee.save();
    const options = getEmailOptions(
      assignee.email,
      req.get("origin"),
      req.body.password,
      "Registration of Account Confirmation",
      "assignee"
    );
    res.send(_.pick(assignee, ["_id", "name", "email"]));
    // if (req.file) deleteFile(req.file.path);
    sendEmail(options);
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

      let assignee = await Assignee.findOne({ email: user.email });
      if (assignee) {
        delete user.password;
        user.responsibilities = tempArray;

        user.message = "User Already exists";
        errors.push(user);
        continue;
      }

      assignee = new Assignee(
        _.pick(user, ["name", "email", "password", "phone", "responsibilities"])
      );
      // const salt = await bcrypt.genSalt(10);
      // assignee.password = await bcrypt.hash(assignee.password, salt);
      const options = getEmailOptions(
        assignee.email,
        req.get("origin"),
        assignee.password,

        "Registration of Account Confirmation",
        "assignee"
      );
      assignee.password = encrypt(assignee.password);
      await assignee.save();
      sendEmail(options);
    }
    sendCsvToClient(req, res, errors);
    if (req.file) deleteFile(req.file.path);
  }
);

router.put("/:id", upload.single("profilePicture"), async (req, res) => {
  // const { error } = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);
  let assignee = await Assignee.findById(req.params.id);
  if (!assignee)
    return res
      .status(404)
      .send("The assignee with the given ID was not found.");
  console.log("req file", req.file);
  console.log("req body", req.body);
  const profilePath = req.file ? req.file.path : req.body.profilePath;
  const updatedUser = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    responsibilities: JSON.parse(req.body.responsibilities),
    profilePath: profilePath,
    profilePicture: assignee.profilePicture
  };
  if (req.file) {
    updatedUser.profilePicture = fs.readFileSync(req.file.path);
  }

  assignee = await Assignee.findByIdAndUpdate(req.params.id, updatedUser, {
    new: true
  });
  res.send(assignee);
  if (req.file) deleteFile(req.file.path);
});

router.put("/change/chatwith/messages/:assigneeId/:id", async (req, res) => {
  const assignee = await Assignee.findOne({ _id: req.params.assigneeId });

  if (!assignee) return res.status(404).send("No Assignee found.");

  assignee.chatWith = req.params.id;

  await assignee.save();

  res.send(assignee);
});

//kindly correct this route
//******************************************** */
// getting assignee based on responsbility
// router.get("/:id", async (req, res) => {
//   const assignees = await Assignee.find({ responsibilities: req.params.id });

//   if (!assignees) return res.status(404).send("There are no Assignees.");

//   res.status(200).send(assignees);
// });

router.delete("/:id", async (req, res) => {
  const assignee = await Assignee.findByIdAndRemove(req.params.id);

  if (!assignee)
    return res.status(404).send("Assignee with given ID Not Found.");

  res.status(200).send(assignee);
});

//

module.exports = router;

// /api/assignees

// router.get("/getPhoto", function(req, res) {
//   Img.findOne({}, "img createdAt", function(err, img) {
//     if (err) res.send(err);
//     // console.log(img);
//     res.contentType("json");
//     res.send(img);
//   }).sort({ createdAt: "desc" });
// });

// router.post("/saveImage", upload.single("image"), function(req, res) {
//   var new_img = new Img();
//   new_img.img.data = fs.readFileSync(req.file.path);
//   new_img.img.contentType = "image/jpeg";
//   new_img.save();
//   res.json({ message: "New image added to the db!" });
// });

// var dir = path.join(__dirname, "..", "profilePictures");
// var mime = {
//   html: "text/html",
//   txt: "text/plain",
//   css: "text/css",
//   gif: "image/gif",
//   jpg: "image/jpeg",
//   JPG: "image/jpeg",
//   png: "image/png",
//   svg: "image/svg+xml",
//   js: "application/javascript"
// };

// router.get("/getImage", function(req, res) {
//   console.log("the directory is", dir);

//   var file = path.join(
//     dir,
//     "cmp-1566303594974-2c8ae6cacd7a0301659bdf32b924b9ba.jpg"
//   );
//   if (file.indexOf(dir + path.sep) !== 0) {
//     return res.status(403).end("Forbidden");
//   }
//   var type = mime[path.extname(file).slice(1)] || "text/plain";
//   var s = fs.createReadStream(file);
//   s.on("open", function() {
//     res.set("Content-Type", type);
//     s.pipe(res);
//   });
//   s.on("error", function() {
//     res.set("Content-Type", "text/plain");
//     res.status(404).end("Not found");
//   });
// });
