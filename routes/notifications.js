const { Notification, validate } = require("../models/notification");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const authUser = require("../middleware/authUser");

router.get("/getnotifications", authUser, async (req, res) => {
  let notifications = [];

  try {
    if (req.user.role === "complainer") {
      notifications = await Notification.find({ "receivers.id": req.user._id })
        .sort({ createdAt: -1 })
        .limit(10);
      console.log("complainer - notifications", notifications);
      if (!notifications) {
        return res.status(404).send("No notifications");
      }
      return res.send(notifications);
    }

    if (req.user.role === "assignee") {
      console.log(req.user._id);
      notifications = await Notification.find({
        "receivers.id": req.user._id
        // companyId: req.user.companyId
      })
        .sort({ createdAt: -1 })
        .limit(10);
      console.log("assignee - notifications", notifications);
      if (!notifications) {
        return res.status(404).send("No notifications");
      }
      return res.send(notifications);
    }

    if (req.user.role === "admin") {
      notifications = await Notification.find({
        "receivers.role": "admin"
        // companyId: req.user.companyId
      })
        .sort({ createdAt: -1 })
        .limit(10);
      console.log("admin - notifications", notifications);
      if (!notifications) {
        return res.status(404).send("No notifications");
      }
      return res.send(notifications);
    }
  } catch (ex) {
    console.log("Error", ex);
  }
});

module.exports = router;
