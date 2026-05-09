const mongoose = require("mongoose");const { Telegraf } = require("telegraf");
const express = require("express");
const { handleCommands } = require("./handlers/commands");

const BOT_TOKEN = "7960639485:AAEocT6nMKmsNWQQqiWCm-rrS4NUsfYachU";
mongoose.connect("mongodb+srv://anup908ui_db_user:mc0nrsRL4nTowugJ@cluster0.mpqyw1u.mongodb.net/?appName=Cluster0")
.then(() => {
  console.log("MongoDB Connected");
})
.catch((err) => {
  console.log(err);
});
const bot = new Telegraf(BOT_TOKEN);

// Load all commands
handleCommands(bot);

// ---------------- EXPRESS SERVER ---------------- //
// Render keeps app alive using Express server

const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running...");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ---------------- BOT START ---------------- //

bot.launch(() => {
  console.log("Telegram Bot Started");
});

// Graceful Stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
