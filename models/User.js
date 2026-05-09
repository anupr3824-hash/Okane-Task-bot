const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  userId: Number,

  username: String,

  balance: {
    type: Number,
    default: 0
  },

  referrals: {
    type: Array,
    default: []
  },

  referredBy: {
    type: Number,
    default: null
  },

  lastBonus: {
    type: Number,
    default: 0
  },

  spinTime: {
    type: Number,
    default: 0
  }

});

module.exports =
mongoose.model("User", userSchema);
