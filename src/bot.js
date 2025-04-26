const { Telegraf, Markup } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const adminBot = new Telegraf(process.env.ADMIN_BOT_TOKEN);
const prisma = new PrismaClient();
const userSessions = new Map();

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

const categoriesKeyboard = {
  keyboard: [
    [{ text: "🐤 Детские товары" }, { text: "💄 Косметика" }],
    [{ text: "🧼 Гигиена" }, { text: "🏠 Товары для дома" }],
    [{ text: "🔙 Назад" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

bot.start((ctx) => {
  ctx.reply("Добро пожаловать!", {
    reply_markup: mainKeyboard,
  });
});

bot.hears("🍀 Наши товары", (ctx) => {
  ctx.reply("Выберите категорию товаров:", {
    reply_markup: categoriesKeyboard,
  });
});

bot.hears("💸 Оплата", (ctx) => {
  ctx.reply(
    "<b>Детали оплаты:</b>\n\nНомер карты: <code>5614680516983760</code>\nИмя владельца карты: <u>Nurxanova Madina</u>\n\nСвяжитесь с нами после оплаты: +998946667410",
    {
      reply_markup: backToMain,
      parse_mode: "HTML",
    }
  );
});

bot.hears("📍 Адрес", (ctx) => {
  ctx.reply(
    "Наш адрес: ул. Примерная, д. 1\n\nhttps://www.google.com/maps?q=41.416103,69.312097",
    {
      reply_markup: backToMain,
    }
  );
});

bot.hears("ℹ️ О нас", (ctx) => {
  ctx.reply(
    "<b>Greenleaf (Suzhou Greenleaf Daily Commodity Co. Ltd)</b> — высокотехнологичная компания из Китая, основанная в 1998 году. Специализируется на производстве экотоваров повседневного спроса, более 3 500 наименований. Производственные мощности — 80 000 тонн в год, используется оборудование из Германии, Франции и Италии. Greenleaf имеет международные контракты, работает в 30+ странах, в том числе в России и Казахстане через ООО «Зелёный лист». Входит в ТОП-100 мировых MLM-компаний.\n\n<b>Миссия:</b> сделать людей счастливее, здоровее, красивее и богаче.",
    {
      reply_markup: backToMain,
      parse_mode: "HTML",
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

async function sendProductsByCategory(ctx, categoryId) {
  const products = await prisma.product.findMany({
    where: { categoryId },
  });

  if (!products.length) {
    return ctx.reply("Нет доступных товаров в этой категории 😢", {
      reply_markup: categoriesKeyboard,
    });
  }

  ctx.reply("Список товаров:", {
    reply_markup: {
      keyboard: [[{ text: "🔙 Назад к категориям" }]],
      resize_keyboard: true,
    },
  });

  for (const product of products) {
    const imagePath = path.join(__dirname, "..", "public", product.image);
    if (fs.existsSync(imagePath)) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Купить", `buy_${product.id}`)],
      ]);
      await ctx.replyWithPhoto(
        { source: fs.createReadStream(imagePath) },
        {
          caption: `*${product.name}*\n\n${product.description}`,
          parse_mode: "Markdown",

          ...keyboard,
        }
      );
    } else {
      ctx.reply(`❌ Изображение не найдено для ${product.name}`);
    }
  }
}

bot.hears("🐤 Детские товары", (ctx) => sendProductsByCategory(ctx, 1));
bot.hears("💄 Косметика", (ctx) => sendProductsByCategory(ctx, 2));
bot.hears("🧼 Гигиена", (ctx) => sendProductsByCategory(ctx, 3));
bot.hears("🏠 Товары для дома", (ctx) => sendProductsByCategory(ctx, 4));

bot.action(/^buy_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) return ctx.reply("❌ Товар не найден");

  userSessions.set(ctx.from.id, { step: "awaiting_phone", product });

  await ctx.answerCbQuery();
  await ctx.reply(
    "Пожалуйста, отправьте свой номер телефона кнопкой ниже или введите вручную (например: +998901234567):",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📞 Отправить номер", request_contact: true }],
          [{ text: "🔙 Назад к категориям" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
});

bot.on("text", (ctx) => {
  const session = userSessions.get(ctx.from.id);

  if (session && session.step === "awaiting_phone") {
    const phone = ctx.message.text.trim();
    const phoneRegex = /^\+?\d{7,15}$/;

    if (!phoneRegex.test(phone)) {
      return ctx.reply(
        "❌ Неверный формат номера. Пожалуйста, введите корректный номер (например: +998901234567):"
      );
    }

    session.phone = phone;
    session.step = "awaiting_location";

    return ctx.reply("Спасибо! Теперь отправьте ваше местоположение:", {
      reply_markup: {
        keyboard: [
          [{ text: "📍 Отправить местоположение", request_location: true }],
          [{ text: "🔙 Назад к категориям" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  if (session && session.step === "awaiting_location") {
    return ctx.reply(
      "❗Пожалуйста, используйте кнопку «📍 Отправить местоположение», чтобы отправить свое местоположение или отправьте другое вручную"
    );
  }
});

bot.on("contact", (ctx) => {
  const session = userSessions.get(ctx.from.id);
  if (!session || session.step !== "awaiting_phone") return;

  const phone = ctx.message.contact.phone_number;

  session.phone = phone;
  session.step = "awaiting_location";

  ctx.reply("Спасибо! Теперь отправьте ваше местоположение:", {
    reply_markup: {
      keyboard: [
        [{ text: "📍 Отправить местоположение", request_location: true }],
        [{ text: "🔙 Назад к категориям" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

bot.on("location", (ctx) => {
  const session = userSessions.get(ctx.from.id);
  if (!session || session.step !== "awaiting_location") return;

  const { latitude, longitude } = ctx.message.location;
  session.location = `https://maps.google.com/?q=${latitude},${longitude}`;

  sendToAdminBot(session, ctx);
  userSessions.delete(ctx.from.id);
});

async function sendToAdminBot(session, ctx) {
  const caption = `<b>🆕 НОВЫЙ ЗАКАЗ 🆕</b>\n\n<b>Товар:</b> ${
    session.product.name
  }\n<b>Телефон:</b> ${session.phone}\n<b>Местоположение:</b> ${
    session.location
  }\n<b>Пользователь:</b> ${ctx.from.first_name} ${
    ctx.from.last_name || ""
  } (@${ctx.from.username || "нет"})`;

  const imagePath = path.join(__dirname, "..", "public", session.product.image);

  try {
    await adminBot.telegram.sendPhoto(
      process.env.ADMIN_CHAT_ID,
      { source: imagePath },
      { caption, parse_mode: "HTML" }
    );

    await ctx.reply("✅ Заказ принят. Спасибо!", {
      reply_markup: mainKeyboard,
    });
  } catch (error) {
    console.error("Ошибка при отправке заказа администратору:", error);
    ctx.reply("❌ Ошибка. Заказ не принят. Повторите попытку позже");
  }
}

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
