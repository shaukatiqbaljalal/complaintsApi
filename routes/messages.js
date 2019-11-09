const mime = require("mime");
const { Message } = require("../models/message");
const fs = require("fs");
const path = require("path");
const uuid = require("uuid/v1");
const multer = require("multer");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const io = require("../socket");

// multer storage
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/files/messages");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `cmp-${uuid()}.${ext}`);
  }
});

// // multer filter
// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image")) {
//     cb(null, true);
//   } else {
//     cb("Only images are allowed", false);
//   }
// };

// multer upload
const upload = multer({
  storage: multerStorage
});

// for getting all messages
router.post("/all", async (req, res) => {
  let message = await Message.find({
    sender: req.body.sender,
    receiver: req.body.receiver
  });

  let message1 = await Message.find({
    sender: req.body.receiver,
    receiver: req.body.sender
  });

  const newArray = _.concat(message, message1);

  if (!newArray) return res.status(404).send("No messages found");

  res.send(newArray);
});

// for sending a message
router.post("/", upload.single("messageBody"), async (req, res) => {
  let message;
  if (req.body.messageBody) {
    console.log("req.body.messageBody");
    message = new Message({
      messageBody: req.body.messageBody,
      sender: req.body.sender,
      receiver: req.body.receiver
    });
  }
  // req.file? req.file.filename
  else if (req.file) {
    console.log("req.file");
    message = new Message({
      messageBody: req.file.filename,
      sender: req.body.sender,
      receiver: req.body.receiver
    });
  }
  await message.save();
  io.getIO().emit("msg", message);
  res.send(message);
});

// for deleting conversation
router.post("/delete", async (req, res) => {
  const msg = await Message.deleteMany({
    sender: req.body.sender,
    receiver: req.body.receiver
  });

  const msg1 = await Message.deleteMany({
    sender: req.body.receiver,
    receiver: req.body.sender
  });

  res.status(200).send("Deleted");
});

// for file downloading
router.get("/file/:id/:filename", async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).send("The Message with given ID was not found.");
    }

    const filePath = path.join(
      "public",
      "files",
      "messages",
      req.params.filename
    );

    const fileExtension = req.params.filename.split(".")[1];

    fs.readFile(filePath, (err, data) => {
      if (err) return next(err);

      res.setHeader("Content-Type", mime.getType(fileExtension));
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + req.params.filename + '"'
      );
      res.send(data);
    });
  } catch (e) {
    res.status(404).send("Could not find image.");
  }
});

module.exports = router;

// /api/messages
