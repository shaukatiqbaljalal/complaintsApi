const nodeMailer = require("nodemailer");
var transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: "crunchtech300@gmail.com",
    pass: "23crunch23"
  }
});
module.exports = function(options) {
  if (!options.from) options.from = "crunchtech300@gmail.com";
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
  from = "crunchtech300@gmail.com"
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
