const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();
const nodeMailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");
const _ = require("lodash");

// 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

// for getting all emails
router.post("/", async (req, res) => {
  const transporter = nodeMailer.createTransport(
    sendGridTransport({
      auth: {
        api_key:
          "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"
      }
    })
  );

  const filePath = path.join("public", "files", "reports", req.body.reportName);

  transporter
    .sendMail({
      to: "muhammadmakkianjum@gmail.com",
      from: "quickresponse@gmail.com",
      subject: "Complaints' Report",
      html:
        "<h1>Attached is report that contains no. of spam, resolved and in-progress complaints. Please have a look.</h1>",
      attachments: [
        {
          name: "report.pdf",
          path: filePath
        }
      ]
    })
    .then(result => {
      res.send("Email is sent");
    })
    .catch(err => console.log("Error"));
});

module.exports = router;

// /api/emails
