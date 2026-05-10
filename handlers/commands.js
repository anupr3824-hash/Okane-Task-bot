const Task = require("../models/Task");
const User = require("../models/User");
const Withdraw = require("../models/Withdraw");
const { Markup } = require("telegraf");

const adminStep = {};
const withdrawStep = {};
const ADMIN_ID = 2002516695;

const CHANNELS = ["@okane3"];

// FORCE JOIN
async function checkForceJoin(ctx) {
  try {
    for (let channel of CHANNELS) {
      const member = await ctx.telegram.getChatMember(
        channel,
        ctx.from.id
      );

      if (member.status === "left" || member.status === "kicked") {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function handleCommands(bot) {

  // START
  bot.start(async (ctx) => {

    const joined = await checkForceJoin(ctx);
    if (!joined) {
      return ctx.reply(`❌ Join All Channels First\n${CHANNELS.join("\n")}`);
    }

    let user = await User.findOne({ userId: ctx.from.id });

    if (!user) {
      user = new User({
        userId: ctx.from.id,
        username: ctx.from.username
      });

      const payload = ctx.startPayload;

      if (payload && payload !== String(ctx.from.id)) {
        const referrer = await User.findOne({
          userId: Number(payload)
        });

        if (referrer && !referrer.referrals.includes(ctx.from.id)) {
          referrer.referrals.push(ctx.from.id);
          referrer.balance += 10;
          referrer.spins = (referrer.spins || 0) + 1;

          await referrer.save();
          user.referredBy = referrer.userId;
        }
      }

      await user.save();
    }

    ctx.reply(
      `🎉 Welcome ${ctx.from.first_name}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("💰 Balance", "balance"),
          Markup.button.callback("👥 Refer", "refer")
        ],
        [
          Markup.button.callback("🎁 Bonus", "bonus"),
          Markup.button.callback("🎰 Spin", "spin")
        ],
        [
          Markup.button.callback("📋 Tasks", "tasks"),
          Markup.button.callback("💸 Withdraw", "withdraw")
        ]
      ])
    );
  });

  // TEXT HANDLER (ADMIN + WITHDRAW)
  bot.on("text", async (ctx) => {

    const step = adminStep[ctx.from.id];

    // ADMIN
    if (ctx.from.id === ADMIN_ID) {

      if (step === "task") {
        const [title, channel, reward] = ctx.message.text.split("|");

        if (!title || !channel || !reward) {
          return ctx.reply("❌ Format: Title | @channel | reward");
        }

        await Task.create({
          title: title.trim(),
          channel: channel.trim(),
          reward: Number(reward.trim())
        });

        adminStep[ctx.from.id] = null;
        return ctx.reply("✅ Task Added");
      }

      if (step === "broadcast") {
        const users = await User.find();

        for (const user of users) {
          try {
            await ctx.telegram.sendMessage(user.userId, ctx.message.text);
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

      if (isNaN(amount) || amount <= 0) {
        return ctx.reply("❌ Invalid Amount");
      }

      const user = await User.findOne({ userId: ctx.from.id });

      if (amount > user.balance) {
        return ctx.reply(`❌ Insufficient Balance\n💰 ${user.balance}`);
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
    await ctx.answerCbQuery();
    ctx.reply(`💰 Balance: ${user.balance}`);
  });

  // REFER
  bot.action("refer", async (ctx) => {
    const me = await ctx.telegram.getMe();
    const link = `https://t.me/${me.username}?start=${ctx.from.id}`;

    const user = await User.findOne({ userId: ctx.from.id });

    await ctx.answerCbQuery();
    ctx.reply(`👥 Link:\n${link}\nReferrals: ${user.referrals.length}`);
  });

  // BONUS
  bot.action("bonus", async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });

    user.balance += 5;
    await user.save();

    ctx.reply("🎁 5 Coins Added");
  });

  // TASKS
  bot.action("tasks", async (ctx) => {
    const tasks = await Task.find();

    if (tasks.length < 1) {
      return ctx.reply("❌ No Tasks");
    }

    for (const t of tasks) {
      await ctx.reply(
        `📋 ${t.title}\n💰 ${t.reward}`,
        Markup.inlineKeyboard([
          [Markup.button.url("Join", `https://t.me/${t.channel.replace("@", "")}`)],
          [Markup.button.callback("Verify", `verify_${t._id}`)]
        ])
      );
    }
  });

  // VERIFY
  bot.action(/verify_(.+)/, async (ctx) => {
    const taskId = ctx.match[1];

    const task = await Task.findById(taskId);
    const user = await User.findOne({ userId: ctx.from.id });

    if (user.completedTasks.includes(taskId)) {
      return ctx.answerCbQuery("Already Done");
    }

    try {
      const member = await ctx.telegram.getChatMember(
        task.channel,
        ctx.from.id
      );

      if (member.status === "left") {
        return ctx.answerCbQuery("Join Channel First");
      }

      user.balance += task.reward;
      user.completedTasks.push(taskId);

      await user.save();

      ctx.reply(`✅ Done\n💰 ${task.reward}`);
    } catch {
      ctx.reply("❌ Error");
    }
  });

  // WITHDRAW
  bot.action("withdraw", async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });

    if (user.balance < 100) {
      return ctx.reply("❌ Min 100");
    }

    withdrawStep[ctx.from.id] = { step: "upi" };
    ctx.reply("Send UPI");
  });

  // ADMIN PANEL
  bot.command("admin", async (ctx) => {

    if (ctx.from.id !== ADMIN_ID) return;

    const totalUsers = await User.countDocuments();
    const totalWithdraws = await Withdraw.countDocuments();

    ctx.reply(
      `👑 ADMIN PANEL\nUsers: ${totalUsers}\nWithdraws: ${totalWithdraws}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Add Task", "admin_task")],
        [Markup.button.callback("Broadcast", "admin_broadcast")]
      ])
    );
  });

  bot.action("admin_task", async (ctx) => {
    adminStep[ctx.from.id] = "task";
    ctx.reply("Send: Title | @channel | reward");
  });

  bot.action("admin_broadcast", async (ctx) => {
    adminStep[ctx.from.id] = "broadcast";
    ctx.reply("Send message");
  });

}

module.exports = {
  handleCommands
};
