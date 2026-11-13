const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==========================================
// ⚠️ এখানে আপনার তথ্য দিন ⚠️
// ==========================================
const BOT_TOKEN = "9213115853:AAHVDACnqSSOFXx3iy4KXv6FGhGfxhx82jc"; 
const ADMIN_ID = "5428249457"; 
// ==========================================

if (BOT_TOKEN === "এখানে আপনার BotFather থেকে পাওয়া টোকেন দিন" || ADMIN_ID === "এখানে আপনার টেলিগ্রাম আইডি দিন") {
  console.error("❌ Error: Apni BOT_TOKEN ba ADMIN_ID set korte vulechen!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Pro Level UI Design
const getMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Host New Bot', 'host_new')],
    [Markup.button.callback('ℹ️ Help', 'help')]
  ]);
};

bot.start((ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply("⛔ Ei bot ta personal. Apni admin na hole eita use korte parben na.");
  }

  const msg = `✨ **Welcome Boss!** ✨\n\n` +
              `Ekhane apni apnar Node.js (`.js`) bot host korte parben.\n` +
              `👇 Niche theke option select korun:`;
  ctx.replyWithMarkdown(msg, getMainMenu());
});

bot.action('host_new', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("📥 **Upload Korun**\n\nApnar bot er `.js` file ti pathan. Ami seta run korbo.");
});

bot.action('help', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("ℹ️ **Help**\n\n1. Apnar `.js` file pathan.\n2. Apnar file er vitore obosshoi apnar Bot Token thakte hobe.\n\n⚠️ *Note: Render free tier e 15 min por bot ghum hoye jay.*");
});

// 📥 ফাইল রিসিভ এবং রান করার লজিক
bot.on('document', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply("⛔ Apni Admin na, file dite parben na!");
  }

  const file = ctx.message.document;
  const fileName = file.file_name;
  const fileId = file.file_id;

  if (!fileName.endsWith('.js')) {
    return ctx.reply("❌ Bhai, shudhu `.js` file pathao!");
  }

  const userDir = path.join(__dirname, 'my_bots');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const filePath = path.join(userDir, fileName);

  try {
    ctx.reply(`⏳ File download hocche: \`${fileName}\`...`, { parse_mode: 'Markdown' });
    
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    ctx.reply("✅ File download shesh! Ekhon bot chalu korchi...");

    const child = exec(`node "${filePath}"`);

    let output = "";
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });

    setTimeout(() => {
      if (child.exitCode === null) {
        ctx.replyWithMarkdown(`🎉 **Bot Successfully Run Hoyechhe!**\n\n\`\`\`\n${output.substring(0, 500) || "Bot is running in background..."}\n\`\`\``);
      } else {
        ctx.replyWithMarkdown(`❌ **Bot Crash Koreche!**\n\nApnar code e error ache. Error Log:\n\`\`\`\n${output.substring(0, 1000)}\n\`\`\``);
      }
    }, 5000);

  } catch (error) {
    console.error(error);
    ctx.reply("❌ File download ba run korte problem hoyeche.");
  }
});

bot.launch().then(() => {
  console.log('✅ Hosting Bot is running successfully!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
