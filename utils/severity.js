const Sentiment = require("sentiment");
const nlp = require("compromise");

module.exports = str => {
  const sentiment = new Sentiment();
  console.log(sentiment.analyze(str), "String");

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

  let severity = "Low";
  if (w.score < -2) {
    severity = "High";
  } else if (w.score < 1) {
    if (adverbCount > 1) severity = "High";
    else severity = "Medium";
  }

  //
  console.log(severity);
  return severity;
};
