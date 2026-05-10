const User = require("../models/User");
const Withdraw = require("../models/Withdraw");
const { Markup } = require("telegraf");

const ADMIN_ID = 2002516695;

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

          refUser.spins = (refUser.spins || 0) + 1;

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

  const user =
  await User.findOne({
    userId: ctx.from.id
  });

  const now = Date.now();

  const cooldown =
  24 * 60 * 60 * 1000;

  // CHECK COOLDOWN
  if (
    now - user.spinTime <
    cooldown
  ) {

    const remaining =
    cooldown -
    (now - user.spinTime);

    const hours =
    Math.floor(
      remaining /
      (1000 * 60 * 60)
    );

    return ctx.reply(
`⏳ You already used spin.

Come back in ${hours} hours`
    );
  }

  const rewards =
[1, 3, 4, 6, 9];

  const random =
  rewards[
    Math.floor(
      Math.random() *
      rewards.length
    )
  ];

  user.balance += random;

  user.spinTime = now;

  await user.save();

  ctx.reply(
`🎰 Spin Result

You won ${random} Coins`
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
  bot.action(
  "withdraw",
  async (ctx) => {

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
`💸 Send Withdraw Format

Example:
upi@paytm 100`
  );

  bot.once("text", async (ctx2) => {

    try {

      const text =
      ctx2.message.text;

      const split =
      text.split(" ");

      if (split.length < 2)
        return;

      const upi = split[0];

      const amount =
      Number(split[1]);

      const user2 =
      await User.findOne({
        userId: ctx2.from.id
      });

      if (
        amount > user2.balance
      ) {

        return ctx2.reply(
          "❌ Insufficient Balance"
        );
      }

      // SAVE REQUEST
      const request =
      new Withdraw({

        userId:
        ctx2.from.id,

        amount,

        upi

      });

      await request.save();

      // DEDUCT BALANCE
      user2.balance -= amount;

      await user2.save();

      // ADMIN MESSAGE
      await ctx.telegram.sendMessage(
        ADMIN_ID,

`💸 New Withdraw Request

👤 User:
${ctx2.from.first_name}

🆔 ID:
${ctx2.from.id}

💰 Amount:
${amount}

🏦 UPI:
${upi}`
      );

      ctx2.reply(
`✅ Withdraw Request Sent

⏳ Wait For Admin Approval`
      );

    } catch (err) {

      console.log(err);

      ctx2.reply(
        "❌ Withdraw Failed"
      );
    }
  });
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

