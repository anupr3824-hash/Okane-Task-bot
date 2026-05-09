const mongoose = require("mongoose");const { Telegraf } = require("telegraf");
const express = require("express");
const { handleCommands } = require("./handlers/commands");

const BOT_TOKEN = process.env.BOT_TOKEN;
mongoose.connect(process.env.MONGO_URL)
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
