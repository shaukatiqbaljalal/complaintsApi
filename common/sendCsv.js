const stringify = require("csv-stringify");
module.exports = function(req, res, errors) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="' + "errors-" + Date.now() + '.csv"'
  );
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Pragma", "no-cache");

  //sendin response as csv
  stringify(errors, { header: true }).pipe(res);
};
