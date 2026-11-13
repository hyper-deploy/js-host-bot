console.log("1. Code start hoyeche...");

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==========================================
// ⚠️ আপনার তথ্য এখানে সেট করা হয়েছে ⚠️
// ==========================================
const BOT_TOKEN = "9213115853:AAHVDACnqSSOFXx3iy4KXv6FGhGfxhx82jc"; 
const ADMIN_ID = "5428249457"; 
// ==========================================

console.log("2. Token check kora hocche...");

if (BOT_TOKEN.includes("এখানে") || ADMIN_ID.includes("এখানে") || ADMIN_ID.includes("যেমন")) {
  console.log("❌ ERROR: Bhai apni BOT_TOKEN ba ADMIN_ID thik koren nai!");
  process.exit(1);
}

console.log("3. Bot create kora hocche...");
const bot = new Telegraf(BOT_TOKEN);

const getMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Host New Bot', 'host_new')],
    [Markup.button.callback('ℹ️ Help', 'help')]
  ]);
};

bot.start((ctx) => {
  console.log("Keu /start diche:", ctx.from.id);
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) {
    return ctx.reply("⛔ Ei bot ta personal. Apni admin na hole eita use korte parben na.");
  }

  ctx.replyWithMarkdown(`✨ **Welcome Boss!** ✨\n\nEkhane apni apnar Node.js (`.js`) bot host korte parben.\n👇 Niche theke option select korun:`, getMainMenu());
});

bot.action('host_new', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("📥 **Upload Korun**\n\nApnar bot er `.js` file ti pathan. Ami seta run korbo.");
});

bot.action('help', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("ℹ️ **Help**\n\n1. Apnar `.js` file pathan.\n2. Apnar file er vitore obosshoi apnar Bot Token thakte hobe.");
});

bot.on('document', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) {
    return ctx.reply("⛔ Apni Admin na, file dite parben na!");
  }

  const file = ctx.message.document;
  const fileName = file.file_name;
  const fileId = file.file_id;

  if (!fileName.endsWith('.js')) {
    return ctx.reply("❌ Bhai, shudhu `.js` file pathao!");
  }

  const userDir = path.join(__dirname, 'my_bots');
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
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
        ctx.replyWithMarkdown(`🎉 **Bot Successfully Run Hoyechhe!**\n\n\`\`\`\n${output.substring(0, 500) || "Bot is running..."}\n\`\`\``);
      } else {
        ctx.replyWithMarkdown(`❌ **Bot Crash Koreche!**\n\nError Log:\n\`\`\`\n${output.substring(0, 1000)}\n\`\`\``);
      }
    }, 5000);

  } catch (error) {
    console.error("File Error:", error);
    ctx.reply("❌ File download ba run korte problem hoyeche.");
  }
});

console.log("4. Bot launch kora hocche...");

bot.launch().then(() => {
  console.log('✅ Bot is running perfectly!');
}).catch((err) => {
  console.log("❌ Launch Error hoyeche! Karon:", err.message);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
