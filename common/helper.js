function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function calculateDays(stamp) {
  var date = new Date(stamp);
  let d = new Date();
  let days =
    Math.ceil(Math.abs(d.getTime() - date.getTime()) / (1000 * 3600 * 24)) - 1;
  return days;
}

module.exports = { calculateDays, capitalizeFirstLetter };
