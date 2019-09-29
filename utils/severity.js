const Sentiment = require("sentiment");
const nlp = require("compromise");

module.exports = str => {
  const sentiment = new Sentiment();

  // 1
  let docForNlp = nlp(str)
    .sentences()
    .terms()
    .out("tags");

  let adverbCount = 0;
  let negCount = 0;

  for (let i = 0; i < docForNlp.length; i++) {
    const tags = docForNlp[i].tags;
    tags.forEach(element => {
      if (element === "Adverb") {
        adverbCount++;
      } else if (element === "Negative") {
        negCount++;
      }
    });
  }

  // 2
  const w = sentiment.analyze(str);
  const positiveWords = w.positive.length;
  const negativeWords = w.negative.length;

  console.log("negative words ", negativeWords);
  console.log("positive words", positiveWords);
  console.log("negative count", negCount);
  console.log("adverb count", adverbCount);

  let severity = "Medium";
  // for severity
  if (negativeWords > positiveWords) {
    console.log("negWords > posWords");
    if (negCount > 2 && adverbCount > negCount) {
      severity = "High";
    } else if (adverbCount < negCount) {
      severity = "Medium";
    }
  } else if (positiveWords > negativeWords) {
    console.log("posWords > negWords");
    if (adverbCount > negCount) severity = "Low";
    else if (negCount > adverbCount) {
      severity = "Medium";
    }
  } else {
    console.log("posWords === negWords");

    if (negCount > adverbCount) {
      severity = "Medium";
    } else if (adverbCount > negCount) {
      severity = "High";
    } else {
      severity = "Low";
    }
  }

  return severity;
};
