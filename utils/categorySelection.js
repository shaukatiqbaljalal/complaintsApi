const Sentiment = require("sentiment");

const electrical = ["fan", "wire", "switch", "button", "tube", "light"];
const accounts = [
  "amount",
  "pay",
  "payment",
  "check",
  "paid",
  "bill",
  "cash",
  "debit",
  "credit",
  "transaction",
  "tax",
  "taxes",
  "amounts",
  "with holding",
  "with hold"
];
const plumbing = [
  "flow",
  "fluid",
  "water",
  "tank",
  "tanks",
  "pipe",
  "pipes",
  "valve",
  "valves"
];

const checkCategory = details => {
  const sentiment = new Sentiment();
  const tokens = sentiment.analyze(details).tokens;

  console.log(tokens);

  let electricCount = 0;
  let accountsCount = 0;
  let plumbingCount = 0;
  let category = "";

  tokens.forEach(token => {
    // 1 - checking for electrical
    electrical.forEach(electricToken => {
      if (token === electricToken) {
        electricCount++;
      }
    });

    // 2 - checking for accounts
    accounts.forEach(accountsToken => {
      if (token === accountsToken) {
        accountsCount++;
      }
    });

    // 3 - checking for plumbing
    plumbing.forEach(plumbingToken => {
      if (token === plumbingToken) {
        plumbingCount++;
      }
    });

    if (electricCount === accountsCount && plumbingCount === 0) {
      category = "Electrical";
    } else if (electricCount === plumbingCount && accountsCount === 0) {
      category = "General";
    } else if (electricCount > 0) {
      category = "Electrical";
    } else if (electricCount === 0 && accountsCount > 0) {
      category = "Accounts";
    } else if (accountsCount === 0 && plumbingCount > 0) {
      category = "Plumbing";
    } else {
      category = "General";
    }
    // if (electricCount === accountsCount && plumbingCount === 0) {
    //   category = "Electrical";
    // } else if (electricCount === plumbingCount && accountsCount === 0) {
    //   category = "General";
    // } else if (electricCount > 0) {
    //   category = "Electrical";
    // } else if (electricCount === 0 && accountsCount > 0) {
    //   category = "Accounts";
    // } else if (accountsCount === 0 && plumbingCount > 0) {
    //   category = "Plumbing";
    // } else {
    //   category = "General";
    // }
  });

  console.log("Category is", category);

  console.log("electricCounts", electricCount);
  console.log("accountsCount", accountsCount);
  console.log("plumbingCount", plumbingCount);

  return category;
};

module.exports = {
  categorySelection: checkCategory
};
