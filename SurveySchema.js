const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const SurveySchema = new Schema(
  {
    name: String,
    id: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Survey", SurveySchema);
