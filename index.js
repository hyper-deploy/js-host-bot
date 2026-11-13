console.log("1. Universal Hosting Bot start hoyeche...");

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');

// ==========================================
// ⚠️ আপনার তথ্য এখানে সেট করা আছে ⚠️
// ==========================================
const BOT_TOKEN = "9213115853:AAHVDACnqSSOFXx3iy4KXv6FGhGfxhx82jc"; 
const ADMIN_ID = "5428249457"; 
// ==========================================

// --- Render Port Error Fix ---
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hosting Bot is running');
}).listen(port, '0.0.0.0', () => {
  console.log(`✅ HTTP server listening on port ${port}`);
});
// -----------------------------

const bot = new Telegraf(BOT_TOKEN);

const getMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Host New Bot', 'host_new')],
    [Markup.button.callback('ℹ️ Help', 'help')]
  ]);
};

bot.start((ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) {
    return ctx.reply("⛔ Ei bot ta personal. Apni admin na hole eita use korte parben na.");
  }
  ctx.replyWithMarkdown("✨ **Welcome Boss!** ✨\n\nEkhane apni apnar Node.js (`.js`) bot host korte parben.\n👇 Niche theke option select korun:", getMainMenu());
});

bot.action('host_new', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("📥 **Upload Korun**\n\nApnar bot er `.js` file ti pathan. Ami seta run korbo.");
});

bot.action('help', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("ℹ️ **Help**\n\n1. Apnar `.js` file pathan.\n2. Ami file er vitore thaka sob package check kore install korbo.\n3. Tarpor bot run korbo.");
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
    
    // ১. ফাইল ডাউনলোড করা
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    ctx.reply("✅ File download shesh! Ekhon library check kora hocche...");

    // ২. ফাইলের ভেতরের require() গুলো খুঁজে বের করা
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    let packages = new Set();

    while ((match = requireRegex.exec(fileContent)) !== null) {
      let pkg = match[1];
      // লোকাল ফাইল বা node এর বিল্ট-ইন মডিউল বাদ দেওয়া
      if (!pkg.startsWith('.') && !pkg.startsWith('/') && !['fs', 'path', 'http', 'https', 'crypto', 'child_process', 'stream', 'stream/promises', 'util', 'os', 'events'].includes(pkg)) {
        // স্কোপড প্যাকেজ (যেমন @distube/ytdl-core) ঠিকভাবে নেওয়া
        if (pkg.startsWith('@')) {
          pkg = pkg.split('/').slice(0, 2).join('/');
        } else {
          pkg = pkg.split('/')[0];
        }

        // কিছু লাইব্রেরির নামে ভুল থাকলে সেটা অটো-ফিক্স করা (যদি প্রয়োজন হয়)
        if (pkg === 'telegram-bot-api') pkg = 'node-telegram-bot-api';
        if (pkg === 'ytdl-core') pkg = '@distube/ytdl-core'; // নতুন ও ভালো ভার্সন
        
        packages.add(pkg);
      }
    }

    // ৩. প্রয়োজনীয় প্যাকেজ ইনস্টল করা
    const packagesToInstall = Array.from(packages).join(' ');
    
    if (packagesToInstall.length > 0) {
      ctx.reply(`📦 Milse ei package gulo: \`${packagesToInstall}\`\nEkhon install korchi... (Ektu somoy lagbe)`, { parse_mode: 'Markdown' });
      
      // --no-save বাদ দেওয়া হয়েছে যাতে প্যাকেজগুলো ঠিকমতো সেভ হয়
      const installCmd = `cd "${userDir}" && npm install ${packagesToInstall} && `;
      runBot(installCmd, filePath, ctx);
    } else {
      ctx.reply("✅ Kono notun package lagbe na. Ekhon bot chalu korchi...");
      runBot('', filePath, ctx);
    }

  } catch (error) {
    console.error("File Error:", error);
    ctx.reply("❌ File download ba run korte problem hoyeche.");
  }
});

// বট রান করার ফাংশন
function runBot(installCmd, filePath, ctx) {
  const runCmd = `${installCmd}node "${filePath}"`;
  
  // maxBuffer বাড়িয়ে দেওয়া হয়েছে যাতে বড় এরর মেসেজও ধরা পড়ে
  const child = exec(runCmd, { maxBuffer: 1024 * 1024 * 10 });

  let output = "";
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });

  // ২০ সেকেন্ড অপেক্ষা করা (ইনস্টল এবং রান হওয়ার জন্য)
  setTimeout(() => {
    if (child.exitCode === null) {
      ctx.replyWithMarkdown(`🎉 **Bot Successfully Run Hoyechhe!**\n\n\`\`\`\n${output.substring(0, 500) || "Bot is running in background..."}\n\`\`\``);
    } else {
      ctx.replyWithMarkdown(`❌ **Bot Crash Koreche!**\n\nError Log:\n\`\`\`\n${output.substring(0, 1000)}\n\`\`\``);
    }
  }, 20000);
}

bot.launch().then(() => {
  console.log('✅ Hosting Bot is running perfectly!');
}).catch((err) => {
  console.log("❌ Launch Error hoyeche! Karon:", err.message);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
