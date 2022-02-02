const express = require("express");
const bodyParser = require("body-parser");
const connectdb = require("./database");
const Answers = require("./AnswerSchema");

const router = express.Router();

router.route("/").get((req, res, next) => {
  if (!req.params.survey) {
    console.log("oups");
  }
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;

  connectdb.then((db) => {
    let data = Answers.find({ survey: req.params.survey });
    Answers.find({}).then((answers) => {
      res.json(answers);
    });
  });
});

module.exports = router;
