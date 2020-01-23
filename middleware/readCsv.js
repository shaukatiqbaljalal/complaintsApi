const csv = require("csv-parser");
const fs = require("fs");
const { capitalizeFirstLetter } = require("./../common/helper");

const { generatePassword } = require("./../middleware/passwordGenerator");
module.exports = async function(req, res, next) {
  let users = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", row => {
      let user = {};
      // parse the give row of csv into json object

      if (row.name && row.email && row.phone) {
        user.name = capitalizeFirstLetter(row.name);
        user.email = row.email.toLowerCase();
        user.phone = row.phone;
        user.password = generatePassword();
      } else {
        console.log("format error");
        req.error = "File should have (name,email,phone) header";
        next();
      }

      if (row.responsibilities) {
        user.responsibilities = row.responsibilities;
      }
      users.push(user);
    })
    .on("end", async () => {
      console.log("File reading ended and users", users);

      req.users = users;
      next();
    });
};
