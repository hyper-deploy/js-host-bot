console.log("1. Advanced Hosting Bot started...");

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process'); // spawn যুক্ত করা হলো
const http = require('http');

// ==========================================
// ⚠️ YOUR DETAILS HERE ⚠️
// ==========================================
const BOT_TOKEN = "9213115853:AAHVDACnqSSOFXx3iy4KXv6FGhGfxhx82jc"; 
const ADMIN_ID = "5428249457"; 
// ==========================================

const BOTS_DIR = path.join(__dirname, 'my_bots');
if (!fs.existsSync(BOTS_DIR)) fs.mkdirSync(BOTS_DIR);

// Track running bots (Stores PID)
const runningBots = new Map(); 

// --- Render Port Error Fix ---
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hosting Bot is running');
}).listen(port, '0.0.0.0', () => console.log(`✅ HTTP server listening on port ${port}`));

const bot = new Telegraf(BOT_TOKEN);

// 🎨 Pro Level Tile UI
const getMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📁 Files & Stats', 'stats'), Markup.button.callback('🚀 Upload New Bot', 'upload_prompt')],
    [Markup.button.callback('📂 Manage Bots', 'manage_list')],
    [Markup.button.callback('🔄 Refresh Menu', 'refresh'), Markup.button.callback('ℹ️ Help', 'help')]
  ]);
};

const getBackMenu = () => {
  return Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'refresh')]]);
};

bot.start((ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.reply("⛔ Unauthorized Access.");
  ctx.replyWithMarkdown("✨ **Welcome to Pro Hosting Panel** ✨\n\nYou can manage all your bots from here. Select an option below:", getMainMenu());
});

bot.action('refresh', async (ctx) => {
  try { await ctx.deleteMessage(); } catch(e) {}
  ctx.replyWithMarkdown("✨ **Welcome to Pro Hosting Panel** ✨\n\nYou can manage all your bots from here. Select an option below:", getMainMenu());
});

// 📊 Stats & Files
bot.action('stats', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  
  let files = [];
  if (fs.existsSync(BOTS_DIR)) {
    files = fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.js'));
  }
  
  const totalBots = files.length;
  const runningCount = runningBots.size;
  
  let statsText = `📊 **System Stats & Files**\n\n`;
  statsText += `📁 Total Bot Files: **${totalBots}**\n`;
  statsText += `🟢 Running Bots: **${runningCount}**\n\n`;
  
  if (totalBots > 0) {
    statsText += `📄 **Uploaded Files:**\n`;
    files.forEach((f, i) => {
      const isRunning = runningBots.has(f) ? '🟢' : '🔴';
      statsText += `${i+1}. ${isRunning} \`${f}\`\n`;
    });
  } else {
    statsText += `_No files found. Upload a new bot._`;
  }
  
  ctx.replyWithMarkdown(statsText, getBackMenu());
});

// 📂 Manage Bots List
bot.action('manage_list', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  
  const files = fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.js'));
  
  if (files.length === 0) {
    return ctx.reply("❌ No bot files found. Please upload one first.", getBackMenu());
  }
  
  let buttons = [];
  files.forEach(file => {
    const isRunning = runningBots.has(file) ? '🟢' : '🔴';
    buttons.push([Markup.button.callback(`${isRunning} ${file}`, `manage_${file}`)]);
  });
  
  buttons.push([Markup.button.callback('🔙 Back', 'refresh')]);
  ctx.reply("📂 **Select a bot to manage:**", Markup.inlineKeyboard(buttons));
});

// 📄 Manage Specific Bot
bot.action(/^manage_(.+)$/, (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  
  const fileName = ctx.match[1];
  const isRunning = runningBots.has(fileName);
  const statusText = isRunning ? "🟢 Running" : "🔴 Stopped";
  
  const buttons = [];
  if (isRunning) {
    buttons.push([Markup.button.callback('🛑 Stop Bot', `stop_${fileName}`)]);
  } else {
    buttons.push([Markup.button.callback('▶️ Start Bot', `start_${fileName}`)]);
  }
  buttons.push([Markup.button.callback('🗑️ Delete File', `delete_${fileName}`)]);
  buttons.push([Markup.button.callback('🔙 Back to List', 'manage_list')]);
  
  ctx.editMessageText(`📄 **File:** \`${fileName}\`\n**Status:** ${statusText}`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  }).catch(() => {});
});

// 🗑️ Delete File
bot.action(/^delete_(.+)$/, (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  const fileName = ctx.match[1];
  const filePath = path.join(BOTS_DIR, fileName);
  
  // Stop if running before deleting
  if (runningBots.has(fileName)) {
    const pid = runningBots.get(fileName);
    try {
      if (process.platform === 'win32') exec(`taskkill /pid ${pid} /T /F`);
      else process.kill(-pid, 'SIGKILL');
    } catch (e) { console.log(e.message); }
    runningBots.delete(fileName);
  }
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  ctx.answerCbQuery("Deleted successfully!");
  ctx.editMessageText(`🗑️ **File Deleted:** \`${fileName}\``, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Back to Menu', 'refresh')]] }
  }).catch(() => {});
});

// ▶️ Start Bot
bot.action(/^start_(.+)$/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  const fileName = ctx.match[1];
  const filePath = path.join(BOTS_DIR, fileName);
  
  if (runningBots.has(fileName)) return ctx.answerCbQuery("Already running!", { show_alert: true });
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    let packages = new Set();

    while ((match = requireRegex.exec(fileContent)) !== null) {
      let pkg = match[1];
      if (!pkg.startsWith('.') && !pkg.startsWith('/') && !['fs', 'path', 'http', 'https', 'crypto', 'child_process', 'stream', 'util', 'os', 'events'].includes(pkg)) {
        if (pkg.startsWith('@')) pkg = pkg.split('/').slice(0, 2).join('/');
        else pkg = pkg.split('/')[0];
        
        if (pkg === 'node-telegram-bot-api') pkg = 'node-telegram-bot-api@0.66.0'; 
        if (pkg === 'ytdl-core') pkg = '@distube/ytdl-core';
        packages.add(pkg);
      }
    }

    const packagesToInstall = Array.from(packages).join(' ');
    await ctx.answerCbQuery("Starting bot...");
    
    let cmd = '';
    if (packagesToInstall) {
      cmd = `cd "${BOTS_DIR}" && npm install ${packagesToInstall} > /dev/null 2>&1 && node "${filePath}"`;
    } else {
      cmd = `node "${filePath}"`;
    }

    // spawn with detached: true to kill process tree later
    const child = spawn(cmd, { shell: true, detached: true });
    runningBots.set(fileName, child.pid);

    child.on('exit', (code) => {
      runningBots.delete(fileName);
      console.log(`Bot ${fileName} stopped with code ${code}`);
    });

    ctx.editMessageText(`✅ **Bot Started:** \`${fileName}\`\n\n_Status updated._`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Manage Bot', `manage_${fileName}`)]] }
    }).catch(() => {});

  } catch (err) {
    ctx.reply(`❌ Error: ${err.message}`);
  }
});

// 🛑 Stop Bot (100% Fixed)
bot.action(/^stop_(.+)$/, (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  const fileName = ctx.match[1];
  
  if (runningBots.has(fileName)) {
    const pid = runningBots.get(fileName);
    
    try {
      // Kill the entire process tree
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`);
      } else {
        process.kill(-pid, 'SIGKILL'); // Render/Linux process group kill
      }
    } catch (e) {
      console.log("Kill error:", e.message);
    }

    runningBots.delete(fileName);
    ctx.answerCbQuery("Stopped!");
    ctx.editMessageText(`🛑 **Bot Stopped:** \`${fileName}\``, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Manage Bot', `manage_${fileName}`)]] }
    }).catch(() => {});
  } else {
    ctx.answerCbQuery("Not running!", { show_alert: true });
  }
});

bot.action('upload_prompt', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("📥 **Upload New Bot**\n\nSend your `.js` file here. The system will automatically detect dependencies and install them.");
});

bot.action('help', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery("Access Denied!");
  ctx.answerCbQuery();
  ctx.replyWithMarkdown("ℹ️ **Help Menu**\n\n1. Upload a `.js` file.\n2. Go to **Manage Bots**.\n3. Click **Start** to run it.\n4. You can **Stop** or **Delete** it anytime.\n\n*Note: Free Render servers may block YouTube or Instagram IPs.*", getBackMenu());
});

// Handle File Upload
bot.on('document', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID.toString()) {
    return ctx.reply("⛔ Unauthorized.");
  }

  const file = ctx.message.document;
  const fileName = file.file_name;
  const fileId = file.file_id;

  if (!fileName.endsWith('.js')) {
    return ctx.reply("❌ Only `.js` files are allowed!");
  }

  const filePath = path.join(BOTS_DIR, fileName);

  try {
    const statusMsg = await ctx.reply(`⏳ Downloading \`${fileName}\`...`, { parse_mode: 'Markdown' });
    
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
      `✅ **File Uploaded Successfully!**\n\n📄 Name: \`${fileName}\`\n\nGo to **Manage Bots** to start it.`, 
      { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[Markup.button.callback('📂 Go to Manage Bots', 'manage_list')]] }
      }
    );

  } catch (error) {
    console.error("Upload Error:", error);
    ctx.reply("❌ Failed to download the file.");
  }
});

bot.launch().then(() => {
  console.log('✅ Hosting Bot is running perfectly!');
}).catch((err) => {
  console.log("❌ Launch Error:", err.message);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
