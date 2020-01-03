const { Notification } = require("../models/notification");
const express = require("express");
const router = express.Router();
const authUser = require("../middleware/authUser");

router.get("/getnotifications", authUser, async (req, res) => {
  let notifications = [];
  let filter = { "receivers.id": req.user._id, companyId: req.user.companyId };
  if (req.user.role === "admin") {
    filter = {
      "receivers.role": "admin",
      companyId: req.user.companyId
    };
  }
  try {
    notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(10);
    if (!notifications.length) {
      return res.status(404).send("No notifications");
    }
    return res.send(notifications);
  } catch (ex) {
    return res.send(ex);
  }
});

module.exports = router;
