const {
  getUsers,
  findUser,
  addUser,
  updateUser,
} = require("../utils/db");

const { Markup } = require("telegraf");

const ADMIN_ID = 123456789;

const CHANNEL_1 = "@okane3";

// FORCE JOIN CHECK
async function checkForceJoin(ctx) {
  try {

    const member = await ctx.telegram.getChatMember(
      CHANNEL_1,
      ctx.from.id
    );

    if (
      member.status === "left" ||
      member.status === "kicked"
    ) {
      return false;
    }

    return true;

  } catch (error) {
    console.log(error);
    return false;
  }
}

function handleCommands(bot) {

  // START COMMAND
  bot.start(async (ctx) => {

    const joined = await checkForceJoin(ctx);

    if (!joined) {
      return ctx.reply(
`❌ Please Join Channel First

${CHANNEL_1}`
      );
    }

    const userId = ctx.from.id;

    const username =
      ctx.from.username || "NoUsername";

    const payload = ctx.startPayload;

    let user = findUser(userId);

    if (!user) {

      const newUser = {
        id: userId,
        username: username,
        balance: 0,
        referrals: [],
        referredBy: null,
        lastBonus: 0,
      };

      // REFERRAL SYSTEM
      if (
        payload &&
        payload !== String(userId)
      ) {

        const referrer =
          findUser(Number(payload));

        if (referrer) {

          if (
            !referrer.referrals.includes(userId)
          ) {

            referrer.referrals.push(userId);

            referrer.balance += 10;

            updateUser(
              referrer.id,
              referrer
            );

            newUser.referredBy =
              referrer.id;
          }
        }
      }

      addUser(newUser);

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
            )
          ]
        ])
      );

    } else {

      ctx.reply(
        `👋 Welcome Back`,
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
            )
          ]
        ])
      );
    }
  });

  // BALANCE BUTTON
  bot.action("balance", async (ctx) => {

    const user = findUser(ctx.from.id);

    await ctx.answerCbQuery();

    ctx.reply(
      `💰 Balance: ${user.balance} Coins`
    );
  });

  // REFER BUTTON
  bot.action("refer", async (ctx) => {

    const botInfo =
      await ctx.telegram.getMe();

    const link =
`https://t.me/${botInfo.username}?start=${ctx.from.id}`;

    await ctx.answerCbQuery();

    ctx.reply(
`👥 Your Referral Link:

${link}`
    );
  });

  // DAILY BONUS
  bot.action("bonus", async (ctx) => {

    const user = findUser(ctx.from.id);

    const now = Date.now();

    const cooldown =
      24 * 60 * 60 * 1000;

    if (
      now - user.lastBonus <
      cooldown
    ) {

      const remaining =
        cooldown -
        (now - user.lastBonus);

      const hours =
        Math.floor(
          remaining /
          (1000 * 60 * 60)
        );

      return ctx.reply(
        `⏳ Come back in ${hours} hours`
      );
    }

    user.balance += 5;

    user.lastBonus = now;

    updateUser(user.id, user);

    ctx.reply(
      "🎁 You received 5 Coins"
    );
  });

  // BALANCE COMMAND
  bot.command("balance", (ctx) => {

    const user = findUser(ctx.from.id);

    ctx.reply(
      `💰 Balance: ${user.balance}`
    );
  });

  // REFER COMMAND
  bot.command("refer", async (ctx) => {

    const botInfo =
      await ctx.telegram.getMe();

    const link =
`https://t.me/${botInfo.username}?start=${ctx.from.id}`;

    ctx.reply(
`👥 Your Referral Link:

${link}`
    );
  });

  // ADMIN COMMAND
  bot.command("admin", (ctx) => {

    if (ctx.from.id !== ADMIN_ID) {
      return ctx.reply(
        "❌ Admin Only"
      );
    }

    const users = getUsers();

    ctx.reply(
`👑 Admin Panel

👥 Total Users: ${users.length}`
    );
  });

}

module.exports = {
  handleCommands,
};
