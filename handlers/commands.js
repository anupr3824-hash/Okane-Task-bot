const Task = require("../models/Task");
const User = require("../models/User");
const Withdraw = require("../models/Withdraw");
const { Markup } = require("telegraf");

const ADMIN_ID = 2002516695;

const adminStep = {};
const withdrawStep = {};

const CHANNELS = ["@okane3"];

async function checkForceJoin(ctx) {
  try {
    for (let ch of CHANNELS) {
      const member = await ctx.telegram.getChatMember(ch, ctx.from.id);
      if (member.status === "left") return false;
    }
    return true;
  } catch {
    return false;
  }
}

function handleCommands(bot) {

  // START
  bot.start(async (ctx) => {

    if (!(await checkForceJoin(ctx))) {
      return ctx.reply("❌ Join Channel First");
    }

    let user = await User.findOne({ userId: ctx.from.id });

    if (!user) {
      user = await User.create({
        userId: ctx.from.id,
        username: ctx.from.username,
        balance: 0,
        spins: 3,
        referrals: [],
        completedTasks: [],
        vip: false
      });
    }

    ctx.reply("🎉 Welcome", Markup.inlineKeyboard([
      [Markup.button.callback("💰 Balance", "balance")],
      [Markup.button.callback("🎰 Spin", "spin")],
      [Markup.button.callback("🎁 Bonus", "bonus")],
      [Markup.button.callback("📋 Tasks", "tasks")],
      [Markup.button.callback("🏆 Leaderboard", "leaderboard")],
      [Markup.button.callback("💸 Withdraw", "withdraw")]
    ]));
  });

  // TEXT HANDLER
  bot.on("text", async (ctx) => {

    const step = adminStep[ctx.from.id];

    // ADMIN
    if (ctx.from.id === ADMIN_ID) {

      if (step === "task") {
        const [title, channel, reward] = ctx.message.text.split("|");

        await Task.create({
          title: title.trim(),
          channel: channel.trim(),
          reward: Number(reward)
        });

        adminStep[ctx.from.id] = null;
        return ctx.reply("✅ Task Added");
      }

      if (step === "broadcast") {
        const users = await User.find();

        for (const u of users) {
          try {
            await ctx.telegram.sendMessage(u.userId, ctx.message.text);
          } catch {}
        }

        adminStep[ctx.from.id] = null;
        return ctx.reply("✅ Broadcast Sent");
      }
    }

    // WITHDRAW FLOW
    const data = withdrawStep[ctx.from.id];
    if (!data) return;

    if (data.step === "upi") {
      data.upi = ctx.message.text;
      data.step = "amount";
      return ctx.reply("💰 Enter Amount");
    }

    if (data.step === "amount") {
      const amount = Number(ctx.message.text);

      const user = await User.findOne({ userId: ctx.from.id });

      if (amount > user.balance) {
        return ctx.reply("❌ Low balance");
      }

      await Withdraw.create({
        userId: ctx.from.id,
        amount,
        upi: data.upi
      });

      user.balance -= amount;
      await user.save();

      delete withdrawStep[ctx.from.id];

      return ctx.reply("✅ Withdraw Request Sent");
    }

  });

  // BALANCE
  bot.action("balance", async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });
    ctx.reply(`💰 Balance: ${user.balance}`);
  });

  // SPIN
  bot.action("spin", async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });

    if (!user.spins) user.spins = 3;

    if (user.spins <= 0) {
      return ctx.reply("❌ No spins left");
    }

    const rewards = [5, 10, 20, 50];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    user.balance += reward;
    user.spins -= 1;

    await user.save();

    ctx.reply(`🎰 Spinning...\n🎉 You got ${reward} coins`);
  });

  // BONUS
  bot.action("bonus", async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });

    const now = Date.now();
    if (user.lastBonus && now - user.lastBonus < 86400000) {
      return ctx.reply("⏳ Already claimed");
    }

    user.balance += 10;
    user.lastBonus = now;

    await user.save();

    ctx.reply("🎁 10 coins added");
  });

  // TASKS
  bot.action("tasks", async (ctx) => {
    const tasks = await Task.find();

    for (const t of tasks) {
      await ctx.reply(
        `${t.title} - ${t.reward}`,
        Markup.inlineKeyboard([
          [Markup.button.url("Join", `https://t.me/${t.channel.replace("@","")}`)],
          [Markup.button.callback("Verify", `verify_${t._id}`)]
        ])
      );
    }
  });

  // VERIFY
  bot.action(/verify_(.+)/, async (ctx) => {
    const task = await Task.findById(ctx.match[1]);
    const user = await User.findOne({ userId: ctx.from.id });

    if (user.completedTasks.includes(task._id)) {
      return ctx.reply("❌ Already done");
    }

    user.balance += task.reward;
    user.completedTasks.push(task._id);

    await user.save();

    ctx.reply("✅ Task done");
  });

  // LEADERBOARD
  bot.action("leaderboard", async (ctx) => {
    const users = await User.find().sort({ balance: -1 }).limit(5);

    let text = "🏆 Leaderboard\n\n";

    users.forEach((u, i) => {
      text += `${i+1}. ${u.username} - ${u.balance}\n`;
    });

    ctx.reply(text);
  });

  // WITHDRAW
  bot.action("withdraw", async (ctx) => {
    withdrawStep[ctx.from.id] = { step: "upi" };
    ctx.reply("Send UPI");
  });

  // ADMIN PANEL
  bot.command("admin", async (ctx) => {

    if (ctx.from.id !== ADMIN_ID) return;

    const users = await User.countDocuments();

    ctx.reply(
      `👑 Admin Panel\nUsers: ${users}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Add Task", "admin_task")],
        [Markup.button.callback("Broadcast", "admin_broadcast")]
      ])
    );
  });

  bot.action("admin_task", (ctx) => {
    adminStep[ctx.from.id] = "task";
    ctx.reply("Send: title|@channel|reward");
  });

  bot.action("admin_broadcast", (ctx) => {
    adminStep[ctx.from.id] = "broadcast";
    ctx.reply("Send message");
  });

}

module.exports = { handleCommands };
