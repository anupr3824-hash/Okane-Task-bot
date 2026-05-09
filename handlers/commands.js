const User = require("../models/User");
const { Markup } = require("telegraf");

const ADMIN_ID = 123456789;

const CHANNELS = [
  "@okane3"
];

async function checkForceJoin(ctx) {

  try {

    for (let channel of CHANNELS) {

      const member =
      await ctx.telegram.getChatMember(
        channel,
        ctx.from.id
      );

      if (
        member.status === "left" ||
        member.status === "kicked"
      ) {
        return false;
      }
    }

    return true;

  } catch (err) {
    console.log(err);
    return false;
  }
}

function handleCommands(bot) {

  // START
  bot.start(async (ctx) => {

    const joined =
    await checkForceJoin(ctx);

    if (!joined) {

      return ctx.reply(
`❌ Join All Channels First

${CHANNELS.join("\n")}`
      );
    }

    let user =
    await User.findOne({
      userId: ctx.from.id
    });

    // CREATE USER
    if (!user) {

      user = new User({
        userId: ctx.from.id,
        username: ctx.from.username
      });

      // REFERRAL
      const payload =
      ctx.startPayload;

      if (
        payload &&
        payload !==
        String(ctx.from.id)
      ) {

        const referrer =
        await User.findOne({
          userId: Number(payload)
        });

        if (
          referrer &&
          !referrer.referrals.includes(
            ctx.from.id
          )
        ) {

          referrer.referrals.push(
            ctx.from.id
          );

          referrer.balance += 10;

          await referrer.save();

          user.referredBy =
          referrer.userId;
        }
      }

      await user.save();
    }

    ctx.reply(
`🎉 Welcome ${ctx.from.first_name}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "💰 Balance",
            "balance"
          ),

          Markup.button.callback(
            "👥 Refer",
            "refer"
          )
        ],

        [
          Markup.button.callback(
            "🎁 Daily Bonus",
            "bonus"
          ),

          Markup.button.callback(
            "🎰 Spin",
            "spin"
          )
        ],

        [
          Markup.button.callback(
            "📋 Tasks",
            "tasks"
          ),

          Markup.button.callback(
            "💸 Withdraw",
            "withdraw"
          )
        ]
      ])
    );
  });

  // BALANCE
  bot.action("balance", async (ctx) => {

    const user =
    await User.findOne({
      userId: ctx.from.id
    });

    await ctx.answerCbQuery();

    ctx.reply(
`💰 Balance:
${user.balance} Coins`
    );
  });

  // REFER
  bot.action("refer", async (ctx) => {

    const me =
    await ctx.telegram.getMe();

    const link =
`https://t.me/${me.username}?start=${ctx.from.id}`;

    const user =
    await User.findOne({
      userId: ctx.from.id
    });

    await ctx.answerCbQuery();

    ctx.reply(
`👥 Referral Link:

${link}

👤 Total Referrals:
${user.referrals.length}`
    );
  });

  // BONUS
  bot.action("bonus", async (ctx) => {

    const user =
    await User.findOne({
      userId: ctx.from.id
    });

    const now = Date.now();

    const cooldown =
    24 * 60 * 60 * 1000;

    if (
      now - user.lastBonus <
      cooldown
    ) {

      return ctx.reply(
        "⏳ Bonus Already Claimed"
      );
    }

    user.balance += 5;

    user.lastBonus = now;

    await user.save();

    ctx.reply(
      "🎁 You Got 5 Coins"
    );
  });

  // SPIN
  bot.action("spin", async (ctx) => {

    const rewards =
    [1, 5, 10, 20, 50];

    const random =
    rewards[
      Math.floor(
        Math.random() *
        rewards.length
      )
    ];

    const user =
    await User.findOne({
      userId: ctx.from.id
    });

    user.balance += random;

    await user.save();

    ctx.reply(
`🎰 You Won ${random} Coins`
    );
  });

  // TASKS
  bot.action("tasks", async (ctx) => {

    ctx.reply(
`📋 Tasks:

1. Join Channel
Reward: 10 Coins

2. Invite 5 Users
Reward: 50 Coins`
    );
  });

  // WITHDRAW
  bot.action("withdraw", async (ctx) => {

    const user =
    await User.findOne({
      userId: ctx.from.id
    });

    if (user.balance < 100) {

      return ctx.reply(
`❌ Minimum Withdraw:
100 Coins`
      );
    }

    ctx.reply(
`💸 Send Your UPI ID`
    );
  });

  // ADMIN
  bot.command("admin", async (ctx) => {

    if (
      ctx.from.id !== ADMIN_ID
    ) {
      return;
    }

    const totalUsers =
    await User.countDocuments();

    ctx.reply(
`👑 ADMIN PANEL

👥 Users:
${totalUsers}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "📢 Broadcast",
            "broadcast"
          )
        ]
      ])
    );
  });

}

module.exports = {
  handleCommands,
};
