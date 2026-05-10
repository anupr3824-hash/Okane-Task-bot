const mongoose =
require("mongoose");

const taskSchema =
new mongoose.Schema({

  title: String,

  channel: String,

  reward: Number

});

module.exports =
mongoose.model(
  "Task",
  taskSchema
);
