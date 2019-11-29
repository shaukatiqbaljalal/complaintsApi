const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);
const cors = require("cors");
const config = require("config");
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const app = express();

const users = require("./routes/users");
const companies = require("./routes/companies");
const complainers = require("./routes/complainers");
const assignees = require("./routes/assignees");
const admins = require("./routes/admins");
const higherAuthorities = require("./routes/higherAuthorities");
const configuration = require("./routes/configurations");
const attachments = require("./routes/attachments");
const categories = require("./routes/categories");
const messages = require("./routes/messages");
const emails = require("./routes/emails");

const complainerComplaints = require("./routes/complainerComplaints");
const assigneeComplaints = require("./routes/assigneeComplaints");
const adminComplaints = require("./routes/adminComplaints");
const samplecsv = require("./routes/samplecsv");

const notifications = require("./routes/notifications");

const authUser = require("./routes/authUser");
const authCompaliner = require("./routes/authComplainer");
const authAssignee = require("./routes/authAssignee");
const authAdmin = require("./routes/authAdmin");
const passwordHelper = require("./routes/passwordHelper");

if (!config.get("jwtPrivateKey")) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined.");
  process.exit(1);
}
console.log(config.get("jwtPrivateKey"));
// connection to MongoDB
// ---------------------//

const uri = config.get("dbUri");
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB...");
    const port = process.env.PORT || 5000;
    const server = app.listen(port, () =>
      console.log(`Listening on port ${port}...`)
    );

    const io = require("./socket").init(server);
    io.on("connection", socket => {
      console.log("New client connected");
      socket.on("disconnect", () => {
        console.log("Client is disconnected");
      });
    });
    // io.on("connect", socket => {
    //   console.log("New client connected connect");
    // });
  })
  .catch(err => console.error("Could not connect to MongoDB..."));
// ---------------------//

// express & other middlewares
app.use(express.json());
app.use(cors());
app.use("/public", express.static(path.join(__dirname, "public")));

// for logging in
app.use("/api/auth-complainer", authCompaliner);
app.use("/api/auth-user", authUser);
app.use("/api/auth-assignee", authAssignee);
app.use("/api/auth-admin", authAdmin);
app.use("/api/password", passwordHelper);

// for creating profiles
app.use("/api/users", users);
app.use("/api/companies", companies);
app.use("/api/complainers", complainers);
app.use("/api/assignees", assignees);
app.use("/api/admins", admins);

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
//for sample csvs
app.use("/api/samplecsv", samplecsv);

// for getting all notifications
app.use("/api/notifications", notifications);

// for messages
app.use("/api/messages", messages);
app.use("/api/emails", emails);
