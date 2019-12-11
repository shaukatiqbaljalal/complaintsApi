const { Assignee, validate } = require("../models/assignee");
const { Admin } = require("../models/admin");
const { Notification } = require("../models/notification");
const { Category } = require("../models/category");
const { Location } = require("../models/location");
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const _ = require("lodash");
const passwordGenrator = require("./../middleware/passwordGenerator");
const readCsv = require("./../middleware/readCsv");
const sendCsvToClient = require("./../common/sendCsv");
const deleteFile = require("./../common/deleteFile");
const multer = require("multer");
const encrypt = require("./../common/encrypt");
const sendEmail = require("../common/sendEmail");
const { getEmailOptions } = require("../common/sendEmail");
const authUser = require("./../middleware/authUser");
const { Complaint } = require("../models/complaint");
const io = require("../socket");

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
  fileFilter: multerFilter,
  limits: {
    fieldSize: 8 * 1024 * 1024
  }
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

    if (req.body.mobileFile) {
      let buff = Buffer.from(req.body.mobileFile, "base64");
      let filename = `cmp-${req.complainer._id}-${Date.now()}.png`;
      let filePath = path.join("profilePictures", filename);

      assignee.set("profilePicture", buff);
      assignee.set("profilePath", filePath);
    }

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
    let validatedUsers = [];
    let users = req.users;

    //create accounts for each entry
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      user.companyId = req.user.companyId;
      const tempArray = user.responsibilities;
      const responsibilities = [];

      //This block only fetches given categories details and puts in user.responsibilities
      if (user.responsibilities) {
        const responsibilitiesArray = user.responsibilities.split("+");
        //each responsibility will be splitted down to actual category and location combination
        // and pushed to responsibilities array
        for (let j = 0; j < responsibilitiesArray.length; j++) {
          const responsbility = responsibilitiesArray[j];
          const categoryPath = responsbility.split(":")[0];
          const locationPath = responsbility.split(":")[1];
          let {
            entity: category,
            entityName: categoryName
          } = await retrieveFromPath(
            categoryPath,
            "Category",
            req.user.companyId
          );

          if (!category) {
            user.responsibilities = tempArray;
            user.message = `The category named '${categoryName}' is not found, So the whole path is invalid and given responsbility is skipped.`;
            console.log(user.message);
            errors.push(user);
            break;
          }

          let {
            entity: location,
            entityName: locationName
          } = await retrieveFromPath(
            locationPath,
            "Location",
            req.user.companyId
          );
          if (!location) {
            user.responsibilities = tempArray;
            user.message = `The location named '${locationName}' is not found, So the whole path is invalid and given responsbility is skipped.`;
            console.log(user.message);
            errors.push(user);
            break;
          }
          let obj = {
            category: category,
            location: location
          };
          responsibilities.push(obj);
        }
      }

      user.responsibilities = responsibilities;
      console.log(responsibilities, "Responsibilities");
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
      user.password = encrypt(user.password);
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
      validatedUsers.push(assignee);
    }

    await Assignee.collection.insertMany(validatedUsers, (err, result) => {
      if (err) return res.status(401).send(err);
      else {
        sendCsvToClient(req, res, errors);

        // res.status(200).send("Successful");
        console.log(result);
        for (let index = 0; index < result.ops.length; index++) {
          const assignee = result.ops[index];
          const options = getEmailOptions(
            assignee.email,
            req.get("origin"),
            assignee.password,
            "Registration of Account Confirmation",
            "assignee"
          );

          try {
            sendEmail(options);
          } catch (error) {
            console.log("Email could not sent to :" + assignee.email);
            // continue;
          }
          if (req.file) deleteFile(req.file.path);
        }
      }
    });
  }
);

router.get("/path/checking", authUser, async (req, res) => {
  let resp = await retrieveFromPath(
    "Abdul>Shaukat iqbal",
    "Location",
    req.user.companyId
  );
  res.send(resp);
});

//A generic function
//type identifies wheter it is Category or Location which you want to determine
//this loop will find categories/locations in the path and the last one in array will be returned
async function retrieveFromPath(path, type = "Category", companyId) {
  const models = {
    Category,
    Location
  };
  const categoriesInPath = path.split(">");
  let entity = null;
  let parent = null;
  let childs = [];

  let entityName = categoriesInPath[0].trim();
  entity = await models[type].findOne({
    [`parent${type}`]: null,
    name: entityName,
    companyId: companyId
  });
  if (!entity) return { entity: null, entityName: entityName };
  childs = await models[type].find({ [`parent${type}`]: entity._id });
  parent = entity;
  for (let i = 1; i < categoriesInPath.length; i++) {
    entityName = categoriesInPath[i].trim();
    entity = childs.find(c => c.name === entityName);
    if (!entity) return { entity: null, entityName: entityName };
    childs = await models[type].find({ [`parent${type}`]: entity._id });
    parent = entity;
  }
  return { entity, entityName };
}

router.put(
  "/:id",
  authUser,
  upload.single("profilePicture"),
  async (req, res) => {
    console.log(req.body);
    // const { error } = validate(req.body);
    // if (error) return res.status(400).send(error.details[0].message);
    let assignee = await Assignee.findById(req.params.id);
    if (!assignee)
      return res
        .status(404)
        .send("The assignee with the given ID was not found.");
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

    if (req.body.mobileFile) {
      let buff = Buffer.from(req.body.mobileFile, "base64");
      let filename = `cmp-${req.user._id}-${Date.now()}.png`;
      let filePath = path.join("profilePictures", filename);
      req.body.profilePath = filePath;
      req.body.profilePicture = buff;
    }

    try {
      assignee = await Assignee.findByIdAndUpdate(req.params.id, req.body, {
        new: true
      });
      console.log(assignee);
      res.send(assignee);
      if (req.file) deleteFile(req.file.path);
    } catch (error) {
      console.log(error);
    }
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

router.delete("/:id", authUser, async (req, res) => {
  let assignedComplaints = await Complaint.find({
    companyId: req.user.companyId,
    assignedTo: req.params.id
  });
  console.log(assignedComplaints, "Assigned complaints");

  for (let index = 0; index < assignedComplaints.length; index++) {
    const complaint = assignedComplaints[index];
    const assignees = await Assignee.find({
      "responsibilities._id": complaint.category.toString(),
      _id: { $ne: req.params.id }
    }).select("name");
    // console.log(assignees, "Assignees of category", complaint);
    let adminAssignee = null;
    let assignee;
    if (assignees.length < 1) {
      adminAssignee = await Admin.findOne({
        companyId: req.user.companyId
      });
    } else if (assignees.length === 1) {
      assignee = assignees[0];
    } else {
      let countArr = [];
      for (let i = 0; i < assignees.length; i++) {
        const a = assignees[i];
        await Complaint.find({
          assignedTo: a._id
        }).count((err, count) => {
          countArr.push(count);
        });
      }
      let minIndex = countArr.indexOf(Math.min(...countArr));
      if (minIndex >= 0) assignee = assignees[minIndex];
    }
    // console.log("Selected assignee or admin", assignee, adminAssignee);
    let newAssigneeId = assignee ? assignee._id : adminAssignee._id;
    let onModel = assignee ? "Assignee" : "Admin";
    console.log(onModel);
    let updated = await Complaint.findByIdAndUpdate(
      complaint._id,
      {
        assignedTo: { _id: newAssigneeId },
        onModel: onModel
      },
      { new: true }
    ).populate("complainer", "_id name");
    let notification = new Notification({
      msg: `You have been assigned with new complaint`,
      receivers: {
        role: "",
        id: updated.assignedTo
      },
      companyId: req.user.companyId,
      complaintId: complaint._id
    });
    console.log("Updated complaint", updated);
    await notification.save();
    io.getIO().emit("complaints", {
      action: "task assigned",
      complaint: updated,
      notification: notification
    });
  }

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
