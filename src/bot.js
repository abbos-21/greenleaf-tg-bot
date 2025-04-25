const { Telegraf, Markup } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const bot = new Telegraf(process.env.BOT_TOKEN);

const channelUsername = "-1002594775347"; // Replace with your actual channel username

// Static lists of message IDs for each category
const productMessageIds = {
  baby_product: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // replace with real message IDs
  hygiene: [],
  cosmetics: [3],
};

// Keyboards remain the same
const mainKeyboard = {
  keyboard: [
    [{ text: "🍀 Наши товары" }, { text: "💸 Оплата" }],
    [{ text: "📍 Адрес" }, { text: "ℹ️ О нас" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const backToMain = {
  keyboard: [[{ text: "🔙 Назад" }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const backToCategories = {
  keyboard: [[{ text: "🔙 Назад к категориям" }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const categoriesKeyboard = {
  keyboard: [
    [{ text: "🐤 Детские товары" }, { text: "🧼 Гигиена" }],
    [{ text: "💄 Косметика" }, { text: "🔙 Назад" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

// Start command
bot.start((ctx) => {
  ctx.reply("Добро пожаловать!", {
    reply_markup: mainKeyboard,
  });
});

// Navigation handlers
bot.hears("🍀 Наши товары", (ctx) => {
  ctx.reply("Выберите категорию товаров:", {
    reply_markup: categoriesKeyboard,
  });
});

bot.hears("💸 Оплата", (ctx) => {
  ctx.reply("Детали оплаты:", {
    reply_markup: backToMain,
  });
});

bot.hears("📍 Адрес", (ctx) => {
  ctx.reply("Наш адрес: ул. Примерная, д. 1", {
    reply_markup: backToMain,
  });
});

bot.hears("ℹ️ О нас", (ctx) => {
  ctx.reply(
    "Greenleaf (Suzhou Greenleaf Daily Commodity Co. Ltd) — высокотехнологичная компания, специализирующаяся на исследованиях, производстве и международном сотрудничестве, с фокусом на экологически чистые косметические и бытовые товары, мощностью 80 000 тонн в год, современными технологиями и глобальным присутствием в более чем 30 странах.",
    {
      reply_markup: backToMain,
    }
  );
});

bot.hears("🔙 Назад", (ctx) => {
  ctx.reply("Главное меню:", {
    reply_markup: mainKeyboard,
  });
});

bot.hears("🔙 Назад к категориям", (ctx) => {
  ctx.reply("Выберите категорию товаров:", {
    reply_markup: categoriesKeyboard,
  });
});

// Product handlers – forward messages
bot.hears("🐤 Детские товары", (ctx) => {
  forwardCategoryPosts(ctx, productMessageIds.baby_product);
});

bot.hears("🧼 Гигиена", async (ctx) => {
  // forwardCategoryPosts(ctx, productMessageIds.hygiene);

  // try {
  //   await ctx.replyWithPhoto("https://picsum.photos/200/300", {
  //     caption: "Here is an image with text.",
  //   });
  // } catch (error) {
  //   console.error("Error sending photo:", error);
  //   ctx.reply("Sorry, there was an error sending the image.");
  // }

  // const keyboard = Markup.inlineKeyboard([
  //   [Markup.button.callback("Click me", "action")],
  // ]);

  // // Send the message with the button below it
  // ctx.reply("Here is a message with a button", keyboard);

  try {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("Click me", "action")],
    ]);

    await ctx.replyWithPhoto("https://picsum.photos/200/300", {
      caption: "Here is an image with text.",
      ...keyboard,
    });
  } catch (error) {
    console.error("Error sending photo:", error);
    ctx.reply("Sorry, there was an error sending the image.");
  }
});

bot.hears("💄 Косметика", async (ctx) => {
  // forwardCategoryPosts(ctx, productMessageIds.cosmetics);

  // try {
  //   const keyboard = Markup.inlineKeyboard([
  //     [Markup.button.callback("Click me", "action")],
  //   ]);

  //   await ctx.replyWithPhoto("https://picsum.photos/200/300", {
  //     caption: "Here is an image with text.",
  //     ...keyboard,
  //   });
  // } catch (error) {
  //   console.error("Error sending photo:", error);
  //   ctx.reply("Sorry, there was an error sending the image.");
  // }

  try {
    const products = await prisma.product.findMany({
      where: {
        categoryId: 2,
      },
    });

    products.forEach((e) => {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("Click me", "action")],
      ]);

      ctx.replyWithPhoto(`http://185.195.27.188:${PORT}${e.image}`, {
        caption: `${e.name}, ${e.description}`,
        ...keyboard,
      });
    });
  } catch (error) {
    console.error(error);
  }
});

// Helper: Forward messages from the channel
function forwardCategoryPosts(ctx, messageIds) {
  if (!messageIds || messageIds.length === 0) {
    return ctx.reply("Нет доступных товаров в этой категории 😢", {
      reply_markup: categoriesKeyboard,
    });
  }

  ctx.reply("Список товаров:", {
    reply_markup: backToCategories,
  });

  messageIds.forEach((id) => {
    ctx.telegram.forwardMessage(ctx.chat.id, channelUsername, id);
  });
}

// Launch
bot.launch();

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
