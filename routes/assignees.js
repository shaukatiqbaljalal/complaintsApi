const { Assignee, validate } = require("../models/assignee");
const { Category } = require("../models/category");
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
const authUser = require("./../middleware/authUser");

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

// router.get("/allUsers/:pageSize", async (req, res) => {
//   console.log(req.headers);
//   const assignees = await Assignee.find().limit(+req.params.pageSize);
//   const numOfUsers = await Assignee.count();
//   if (!assignees) return res.status(404).send("There are no Assignees.");
//   res
//     .header("count", numOfUsers)
//     .status(200)
//     .send(assignees);
// });

router.get("/all", authUser, async (req, res) => {
  const assignees = await Assignee.find({ companyId: req.user.companyId });

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

//getting assignee based on his/her _id
router.get("/me/:id", authUser, async (req, res) => {
  const assignees = await Assignee.findOne({
    _id: req.params.id,
    companyId: req.user.companyId
  });

  if (!assignees) return res.status(404).send("There are no Assignees.");

  res.status(200).send(assignees);
});

router.get("/:id", authUser, async (req, res) => {
  const assignee = await Assignee.findOne({
    _id: req.params.id,
    companyId: req.user.companyId
  });

  if (!assignee)
    return res.status(404).send("There is no Assignee with given Id.");

  res.status(200).send(assignee);
});

router.get("/email/:email", authUser, async (req, res) => {
  const assignee = await Assignee.findOne({
    email: req.params.email,
    companyId: req.user.companyId
  });

  if (!assignee)
    return res.status(404).send("There is no Assignee with given Id.");

  res.send(_.pick(assignee, ["_id", "name", "email", "profilePicture"]));
});

router.post(
  "/",
  upload.single("profilePicture"),
  authUser,
  passwordGenrator,
  async (req, res) => {
    req.body.companyId = req.user.companyId;
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let assignee = await Assignee.findOne({
      email: req.body.email,
      companyId: req.user.companyId
    });
    if (assignee) return res.status(400).send("User already registered.");
    if (req.body.responsibilities)
      req.body.responsibilities = JSON.parse(req.body.responsibilities);
    assignee = new Assignee(req.body);
    if (req.file) {
      assignee.set("profilePath", req.file.filename);
      assignee.set("profilePicture", fs.readFileSync(req.file.path));
    }
    console.log(assignee);
    // const salt = await bcrypt.genSalt(10);
    // assignee.password = await bcrypt.hash(assignee.password, salt);

    assignee.password = encrypt(assignee.password);
    try {
      await assignee.save();
    } catch (error) {
      return res.status(500).send("Could not create user");
    }
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
  authUser,
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
      user.companyId = req.user.companyId;
      const tempArray = user.responsibilities;
      const responsibilities = [];

      //This block only fetches given categories details and puts in user.responsibilities
      if (user.responsibilities) {
        const categoryPathsArray = user.responsibilities.split("+");
        console.log(categoryPathsArray, "All Paths");
        //each path will be iterated through
        for (let j = 0; j < categoryPathsArray.length; j++) {
          const path = categoryPathsArray[j];

          const categoriesInPath = path.split(">");
          console.log("Certain Categories in path", categoriesInPath);
          //this loop will find categories in the path and the last one in array will be assigned to user
          let category = null;
          let parentCategory = null;
          let childs = [];
          for (let i = 0; i < categoriesInPath.length; i++) {
            const categoryName = categoriesInPath[i].trim();
            console.log(categoryName, "Category names");

            if (i == 0) {
              category = await Category.findOne({
                parentCategory: null,
                name: categoryName
              });
              console.log("root category", category);
            } else {
              category = childs.find(c => c.name === categoryName);
            }
            //if  category with given name is not found
            //break loop and go for the next path
            //add message into user object as well i.e root category not found

            if (!category) {
              user.responsibilities = tempArray;
              user.message = `The category named '${categoryName}' is not found, So the whole path is invalid and given responsbility is skipped.`;
              console.log(user.message);
              errors.push(user);
              break;
            }

            console.log("Category found");
            //If category found and it is last in path array
            if (i === categoriesInPath.length - 1)
              responsibilities.push(category);
            else childs = await Category.find({ parentCategory: category._id });
            parentCategory = category;
          }
        }

        user.responsibilities = responsibilities;
      }

      console.log("user after responsibilities", user);
      //validate user object. if error then skip the account creation
      const { error } = validate(user);
      let assignee = await Assignee.findOne({
        email: user.email,
        companyId: user.companyId
      });

      if (error || assignee) {
        delete user.password;
        delete user.companyId;
        user.responsibilities = tempArray;
        user.message += assignee
          ? "User Already exists"
          : "--" + error.details[0].message;
        errors.push(user);
        continue;
      }

      assignee = new Assignee(
        _.pick(user, [
          "name",
          "email",
          "password",
          "phone",
          "responsibilities",
          "companyId"
        ])
      );

      const options = getEmailOptions(
        assignee.email,
        req.get("origin"),
        assignee.password,
        "Registration of Account Confirmation",
        "assignee"
      );

      assignee.password = encrypt(assignee.password);
      try {
        await assignee.save();
        sendEmail(options);
      } catch (error) {
        delete user.password;
        delete user.companyId;
        user.message = JSON.stringify(error);
        errors.push(user);
        continue;
      }
    }
    sendCsvToClient(req, res, errors);
    if (req.file) deleteFile(req.file.path);
  }
);

router.put(
  "/:id",
  authUser,
  upload.single("profilePicture"),
  async (req, res) => {
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);
    let assignee = await Assignee.findById(req.params.id);
    if (!assignee)
      return res
        .status(404)
        .send("The assignee with the given ID was not found.");
    console.log("req file", req.file);
    console.log("req body", req.body);
    if (req.body.email) {
      let alreadyRegistered = await Assignee.findOne({
        email: req.body.email.toLowerCase(),
        companyId: req.user.companyId
      });
      if (alreadyRegistered && alreadyRegistered._id != req.params.id)
        return res.status(400).send("email already registered");
    }

    const profilePath = req.file ? req.file.path : req.body.profilePath;
    let profilePicture = assignee.profilePicture;
    if (req.file) {
      profilePicture = fs.readFileSync(req.file.path);
    }
    if (!profilePath) profilePicture = null;
    req.body.profilePath = profilePath;
    req.body.profilePicture = profilePicture;
    req.body.password = assignee.password;

    if (req.body.responsibilities)
      req.body.responsibilities = JSON.parse(req.body.responsibilities);

    assignee = await Assignee.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.send(assignee);
    if (req.file) deleteFile(req.file.path);
  }
);

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
