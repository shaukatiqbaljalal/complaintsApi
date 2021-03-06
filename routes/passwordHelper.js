const { Assignee } = require("../models/assignee");
const { SuperAdmin } = require("../models/superAdmin");
const { Admin } = require("../models/admin");
const { Complainer } = require("../models/complainer");
const express = require("express");
const router = express.Router();
const decrypt = require("../common/decrypt");
const encrypt = require("../common/encrypt");
const sendEmail = require("../common/sendEmail");
const authUser = require("./../middleware/authUser");

router.post("/recover", async (req, res) => {
  const { role, email, companyId } = req.body;
  console.log("recover", role, email, companyId);
  if (!role || !companyId)
    return res.status(400).send("Role, and company id is required");
  let user;
  if (role === "assignee")
    user = await Assignee.findOne({ email: email, companyId: companyId });
  else if (role === "admin")
    user = await Admin.findOne({ email: email, companyId: companyId });
  else if (role === "complainer")
    user = await Complainer.findOne({ email: email, companyId: companyId });
  else if (role === "superAdmin")
    user = await Complainer.findOne({ email: email });

  if (!user)
    return res
      .status(404)
      .send("There is no user with given Id and under the role=" + role);
  console.log(user);
  const password = decrypt(user.password);
  const options = {
    to: email,
    subject: "Password recovery",
    html: `<p>Your account password is: <strong>${password}</strong></p>`
  };

  res.send("Password has been sent to your email address");
  sendEmail(options);
});

router.put("/reset", authUser, async (req, res) => {
  const { role, id, currentPassword, newPassword } = req.body;
  let Model = {
    assignee: Assignee,
    complainer: Complainer,
    admin: Admin,
    superAdmin: SuperAdmin
  };
  let user = await Model[role].findById(id);
  if (!user)
    return res
      .status(404)
      .send("There is no user with given Id and under the role=" + role);

  const oldPassword = decrypt(user.password);
  console.log(oldPassword);

  if (oldPassword !== currentPassword)
    return res
      .status(400)
      .send("Current Password is not valid. Please try again");

  user.password = encrypt(newPassword);
  try {
    const updated = await user.save();
    console.log(updated);
    res.status(200).send("Password Successfully Updated");
    const options = {
      to: user.email,
      subject: "Password Updated",
      html: `<p>Your account password is has been updated.</p>`
    };
    sendEmail(options);
  } catch (error) {
    res.send(error);
  }
});
module.exports = router;
