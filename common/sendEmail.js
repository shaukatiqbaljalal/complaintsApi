const nodeMailer = require("nodemailer");
const config = require("config");

var transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: config.get("emailServer").email,
    pass: config.get("emailServer").password
  }
});
module.exports = function(options) {
  if (!options.from) options.from = config.get("emailServer").email;
  transporter
    .sendMail(options)
    .then(result => {
      console.log("success");
    })
    .catch(err => console.log(err));
};

module.exports.getEmailOptions = function(
  recieverEmail,
  origin,
  password,
  subject,
  role,
  from = config.get("emailServer").email
) {
  const body = `<h4>You are registered on Quick Response Feedback System</h4><br/>
    <p>Kindly visit the site ${origin}/login</p>
    <p>Your login credentials are</p>
    <p><strong>Email:</strong> ${recieverEmail}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p><strong>Role:</strong> ${role}</p>
    `;
  const options = {
    to: recieverEmail,
    from: from,
    subject: subject,
    html: body
  };
  return options;
};

module.exports.getReportsEmailOptions = function(
  recieverEmail,
  subject,
  filePath,
  from = "crunchtech300@gmail.com"
) {
  const body = `<h5>Attached is report that contains no. of spam, resolved and in-progress complaints. </h5>    `;

  const options = {
    to: recieverEmail,
    from: from,
    subject: subject,
    html: body,
    attachments: [
      {
        name: "report.pdf",
        path: filePath
      }
    ]
  };
  return options;
};
