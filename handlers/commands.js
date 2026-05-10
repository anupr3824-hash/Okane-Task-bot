const Task = require("../models/Task");
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

  // ADVANCED SPIN
bot.action(
  "spin",
  async (ctx) => {

  const user =
  await User.findOne({
    userId: ctx.from.id
  });

  await ctx.answerCbQuery();

  // DEFAULT VALUES
  if (!user.spins)
    user.spins = 3;

  if (!user.lastSpin)
    user.lastSpin = 0;

  // COOLDOWN
  const cooldown =
  60 * 60 * 1000;

  const now = Date.now();

  // RESET DAILY SPINS
  if (
    now - user.lastSpin >
    cooldown
  ) {

    user.spins = 3;
  }

  // NO SPINS
  if (user.spins <= 0) {

    return ctx.reply(
`❌ No Spins Left

⏳ Come back later
or invite friends`
    );
  }

  // REWARDS
  const rewards = [
    1,
    3,
    4,
    6,
    9,
    15,
    25
  ];

  // RANDOM
  const reward =
  rewards[
    Math.floor(
      Math.random() *
      rewards.length
    )
  ];

  // JACKPOT
  let jackpotText = "";

  if (reward === 25) {

    jackpotText =
"\n\n🎉 JACKPOT WIN!";
  }

  // UPDATE USER
  user.balance += reward;

  user.spins -= 1;

  user.lastSpin = now;

  await user.save();

  ctx.reply(
`🎡 SPIN RESULT

🎁 Reward:
${reward} Coins

🎯 Spins Left:
${user.spins}

💰 Balance:
${user.balance}${jackpotText}`
  );
});

  // TASKS BUTTON
bot.action(
  "tasks",
  async (ctx) => {

  const tasks =
  await Task.find();

  if (tasks.length < 1) {

    return ctx.reply(
      "❌ No Tasks Available"
    );
  }

  for (const task of tasks) {

    await ctx.reply(

`📋 ${task.title}

🎁 Reward:
${task.reward} Coins`,

      Markup.inlineKeyboard([

        [
          Markup.button.url(
            "📢 Join Channel",
            `https://t.me/${task.channel.replace("@","")}`
          )
        ],

        [
          Markup.button.callback(
            "✅ Verify",
            `verify_${task._id}`
          )
        ]

      ])
    );
  }
});


// VERIFY TASK
bot.action(
/verify_(.+)/,
async (ctx) => {

  const taskId =
  ctx.match[1];

  const task =
  await Task.findById(
    taskId
  );

  const user =
  await User.findOne({
    userId: ctx.from.id
  });

  // ALREADY CLAIMED
  if (
    user.completedTasks.includes(
      taskId
    )
  ) {

    return ctx.answerCbQuery(
      "❌ Already Claimed"
    );
  }

  try {

    // CHECK CHANNEL JOIN
    const member =
    await ctx.telegram.getChatMember(

      task.channel,

      ctx.from.id

    );

    if (
      member.status ===
      "left"
    ) {

      return ctx.answerCbQuery(
        "❌ Join Channel First"
      );
    }

    // GIVE REWARD
    user.balance +=
    task.reward;

    // SAVE CLAIM
    user.completedTasks.push(
      taskId
    );

    await user.save();

    ctx.reply(
`✅ Task Completed

🎁 Reward:
${task.reward} Coins

💰 Balance:
${user.balance}`
    );

  } catch {

    ctx.reply(
      "❌ Verification Failed"
    );
  }
});

  // WITHDRAW STEP STORAGE
const withdrawStep = {};


// WITHDRAW BUTTON
bot.action(
  "withdraw",
  async (ctx) => {

  const user =
  await User.findOne({
    userId: ctx.from.id
  });

  await ctx.answerCbQuery();

  // MIN BALANCE
  if (user.balance < 100) {

    return ctx.reply(
`❌ Minimum Withdraw:
100 Coins`
    );
  }

  // CREATE USER SESSION
  withdrawStep[
    ctx.from.id
  ] = {
    step: "upi"
  };

  ctx.reply(
`🏦 Send Your UPI ID

Example:
anup@paytm`
  );
});


// HANDLE TEXT
bot.on(
  "text",
  async (ctx) => {

  const data =
  withdrawStep[
    ctx.from.id
  ];

  // NO ACTIVE WITHDRAW
  if (!data) return;

  const text =
  ctx.message.text;

  // STEP 1 => UPI
  if (
    data.step === "upi"
  ) {

    // SAVE UPI
    data.upi = text;

    // NEXT STEP
    data.step = "amount";

    return ctx.reply(
`💰 Enter Withdraw Amount`
    );
  }

  // STEP 2 => AMOUNT
  if (
    data.step === "amount"
  ) {

    const amount =
    Number(text);

    // INVALID AMOUNT
    if (
      isNaN(amount) ||
      amount <= 0
    ) {

      return ctx.reply(
        "❌ Invalid Amount"
      );
    }

    const user =
    await User.findOne({
      userId: ctx.from.id
    });

    // BALANCE CHECK
    if (
      amount > user.balance
    ) {

      return ctx.reply(
`❌ Insufficient Balance

💰 Balance:
${user.balance}`
      );
    }

    // SAVE REQUEST
    const request =
    new Withdraw({

      userId:
      ctx.from.id,

      amount,

      upi:
      data.upi

    });

    await request.save();

    // DEDUCT BALANCE
    user.balance -= amount;

    await user.save();

    // SUCCESS MESSAGE
    await ctx.reply(
`✅ Withdraw Request Sent

🏦 UPI:
${data.upi}

💰 Amount:
${amount}

⏳ Wait For Admin Approval`
    );

    // ADMIN MESSAGE
    await ctx.telegram.sendMessage(

      ADMIN_ID,

`💸 NEW WITHDRAW REQUEST

👤 User:
${ctx.from.first_name}

🆔 User ID:
${ctx.from.id}

🏦 UPI:
${data.upi}

💰 Amount:
${amount}`
    );

    // REMOVE SESSION
    delete withdrawStep[
      ctx.from.id
    ];
  }
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

