const express = require("express");
const bodyParser = require("body-parser");
const connectdb = require("./database");
const Answers = require("./AnswerSchema");

const router = express.Router();

router.route("/:room").get((req, res, next) => {
  if (req.params.room == null) {
    throw new Error("Unauthorized. A valid survey name must be provided");
  }

  connectdb.then((db) => {
    let data = Answers.find({ survey: req.params.room });
    data.then((answers) => {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.json(answers);
    });
  });
});

module.exports = router;
