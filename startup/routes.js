const express = require("express");
const error = require("../middleware/error");
const cors = require("cors");
const path = require("path");
const messages = require("../routes/messages");
const emails = require("../routes/emails");
const users = require("../routes/users");
const companies = require("../routes/companies");
const complainers = require("../routes/complainers");
const assignees = require("../routes/assignees");
const admins = require("../routes/admins");
const higherAuthorities = require("../routes/higherAuthorities");
const configuration = require("../routes/configurations");
const attachments = require("../routes/attachments");
const categories = require("../routes/categories");
const locations = require("../routes/locations");
const complainerComplaints = require("../routes/complainerComplaints");
const assigneeComplaints = require("../routes/assigneeComplaints");
const adminComplaints = require("../routes/adminComplaints");
const authUser = require("../routes/authUser");
const authCompaliner = require("../routes/authComplainer");
const authAssignee = require("../routes/authAssignee");
const authAdmin = require("../routes/authAdmin");
const authSuperAdmin = require("../routes/authSuperAdmin");
const passwordHelper = require("../routes/passwordHelper");
const samplecsv = require("../routes/samplecsv");
const superAdmins = require("../routes/superAdmins");

const notifications = require("../routes/notifications");

module.exports = function(app) {
  // for logging in
  app.use(express.json());
  app.use(cors());
  app.use("/public", express.static(path.join(__dirname, "..", "public")));

  //for sample csvs
  app.use("/api/samplecsv", samplecsv);

  // for getting all notifications
  app.use("/api/notifications", notifications);

  // for messages
  app.use("/api/messages", messages);
  app.use("/api/emails", emails);

  //For authentcation
  app.use("/api/auth-complainer", authCompaliner);
  app.use("/api/auth-user", authUser);
  app.use("/api/auth-assignee", authAssignee);
  app.use("/api/auth-admin", authAdmin);
  app.use("/api/auth-superAdmin", authSuperAdmin);
  app.use("/api/password", passwordHelper);

  // for creating profiles
  app.use("/api/users", users);
  app.use("/api/companies", companies);
  app.use("/api/complainers", complainers);
  app.use("/api/assignees", assignees);
  app.use("/api/admins", admins);
  app.use("/api/super-admins", superAdmins);

  //For configurations
  app.use("/api/higher-authorities", higherAuthorities);
  app.use("/api/attachments", attachments);
  app.use("/api/config", configuration);

  // getting / posting of complaints , role vise
  app.use("/api/complainer-complaints", complainerComplaints);
  app.use("/api/assignee-complaints", assigneeComplaints);
  app.use("/api/admin-complaints", adminComplaints);

  // for getting all categories
  app.use("/api/categories", categories);

  // for getting all locations
  app.use("/api/locations", locations);
  app.use(error);
};
