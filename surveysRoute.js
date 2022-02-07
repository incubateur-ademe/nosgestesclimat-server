const express = require("express");
const bodyParser = require("body-parser");
const connectdb = require("./database");
const Survey = require("./SurveySchema");

const router = express.Router();

router.route("/:room").get((req, res, next) => {
  if (req.params.room == null) {
    throw new Error("Unauthorized. A valid survey name must be provided");
  }

  connectdb.then((db) => {
    let data = Survey.find({ name: req.params.room });
    data.then((survey) => {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.json(survey);
    });
  });
});

router.route("/").post((req, res) => {
  if (req.body.room == null) {
    throw new Error("Error. A survey name must be provided");
  }

  connectdb.then((db) => {
    const survey = new Survey({ name: req.body.room });
    survey.save((error) => {
      if (error) {
        res.send(error);
      }

      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.json(survey);
    });
  });
});

module.exports = router;
