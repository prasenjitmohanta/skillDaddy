/**
 * SkillDaddy Telegram Bot ♡
 * Complete In-Telegram Private Ticket & Order Management System
 * 
 * Flow:
 * 1. Customer runs /start, /ticket, or /yesdaddy -> Branded Welcome Menu.
 * 2. Start Order / Open Private Ticket:
 *    - Step 1: Select Plan (Beginner to All Access ₹600)
 *    - Step 2: Display QR Code Photo & UPI (surajprasadsoren78@okaxis)
 *    - Step 3: Input Account Username / Gmail
 *    - Step 4: Input Account Password (Confidential)
 *    - Step 5: Upload Payment Screenshot
 * 3. Customer gets Secret Codename & Ticket Confirmation.
 * 4. Admin Vault (1793240180) receives full Dossier + Payment Screenshot + Action Buttons:
 *    [ ✅ Verify & Accept ]  [ ❌ Reject ]  [ 🎉 Mark Done ]
 * 5. Two-Way Private Chat:
 *    - Admin swipe-replies in Telegram -> delivers to Customer anonymously.
 *    - Customer texts bot -> delivers to Admin Vault.
 * 6. Customer Live Queue Channel Auto-Sync & /postchannel integration.
 */

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// QR Code Image Asset
const QR_PATH = path.join(__dirname, 'assets', 'qr_code.jpg');

// Config Storage (Persists Admin Group, Queue Channel, UPI ID, Channel Link)
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  adminChatId: process.env.TELEGRAM_ADMIN_ID ? String(process.env.TELEGRAM_ADMIN_ID).trim() : '1793240180',
  queueChannelId: '',
  queueMessageId: null,
  upiId: process.env.UPI_ID || 'surajprasadsoren78@okaxis',
  payeeName: 'Suraj Prasad Soren',
  channelLink: process.env.TELEGRAM_CHANNEL_LINK || 'https://t.me/SkillDaddyOfficial',
  discordLink: process.env.DISCORD_INVITE_LINK || 'https://discord.gg/xhWTS5csKZ'
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    config = { ...config, ...loaded };
  } catch (e) {}
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

// Lightweight Health-Check HTTP Server
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('👑 SkillDaddy Telegram Bot is Running! ♡');
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    server.listen(0);
  }
});
server.listen(PORT, () => {
  console.log(`[Health Server] Listening on port ${PORT}`);
});

// Orders Storage
const ORDERS_FILE = path.join(__dirname, 'orders.json');
let orders = [];
if (fs.existsSync(ORDERS_FILE)) {
  try {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  } catch (e) {
    orders = [];
  }
}

function saveOrders() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save orders:', e.message);
  }
}

// Persistent Session Storage (Survives bot restarts)
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');
let sessionsData = {};
if (fs.existsSync(SESSIONS_FILE)) {
  try {
    sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch (e) {
    sessionsData = {};
  }
}

function getSession(userId) {
  return sessionsData[String(userId)];
}

function setSession(userId, data) {
  if (!data) {
    delete sessionsData[String(userId)];
  } else {
    sessionsData[String(userId)] = data;
  }
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsData, null, 2), 'utf-8');
  } catch (e) {}
}

// Funny Codename Generator
const ADJECTIVES = ['Shadow', 'Neon', 'Cyber', 'Mystic', 'Phantom', 'Cosmic', 'Turbo', 'Ninja', 'Stellar', 'Rogue', 'Savage', 'Blazing', 'Frosty', 'Thunder', 'Quantum', 'Pixel', 'Hyper', 'Stealth', 'Crimson', 'Venom', 'Glitch', 'Nova'];
const NOUNS = ['Panda', 'Wolf', 'Phoenix', 'Dragon', 'Tiger', 'Falcon', 'Shark', 'Viper', 'Hawk', 'Lion', 'Cobra', 'Raven', 'Panther', 'Fox', 'Bear', 'Eagle', 'Lynx', 'Ghost', 'Wraith'];

function generateCodename() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}_${num}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Check if user or chat is Admin
function isAdmin(ctx) {
  const senderId = String(ctx.from?.id || '');
  const chatId = String(ctx.chat?.id || '');
  const boundAdmin = String(config.adminChatId || '').trim();
  const envAdmin = String(process.env.TELEGRAM_ADMIN_ID || '').trim();
  return senderId === boundAdmin || chatId === boundAdmin || senderId === envAdmin;
}

// Service Plans
const PLANS = {
  'level1': { name: 'Level 1: Beginner', price: '₹100', desc: 'Let\'s get you started 🌱' },
  'level2': { name: 'Level 2: Elementary', price: '₹200', desc: 'Build the basics 📖' },
  'level3': { name: 'Level 3: Intermediate', price: '₹300', desc: 'Get things serious 📊' },
  'level4': { name: 'Level 4: Advance', price: '₹400', desc: 'Level up your game 🚀' },
  'level5': { name: 'Level 5: Accelerated', price: '₹500', desc: 'For the real ones ⚡' },
  'level_all': { name: '👑 ALL ACCESS (All 5 Levels)', price: '₹600', desc: 'Best deal — All 5 Levels at once (Save ₹900) 🔥' }
};

// Global error handler
bot.catch((err, ctx) => {
  console.error(`[SkillDaddy Bot] Handled error in ${ctx?.updateType}:`, err.message);
});

// Process-level unhandled exception guard
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err.message);
});

// Main Customer Menu
function getMainMenuKeyboard(isAdminUser = false) {
  const buttons = [
    [Markup.button.callback('👑 Open Private Ticket & Order', 'flow_start')],
    [Markup.button.callback('💳 Pricing & QR Code', 'menu_pricing')],
    [Markup.button.callback('🔍 Check My Orders / Status', 'menu_status')],
    [Markup.button.callback('💬 Direct Message Admin', 'menu_chat_admin')],
    [Markup.button.url('📢 Official Telegram Channel', config.channelLink)]
  ];
  if (isAdminUser) {
    buttons.push([Markup.button.callback('⚙️ Admin Dashboard & Tools', 'admin_dashboard')]);
  }
  return Markup.inlineKeyboard(buttons);
}

// Plan Selection Keyboard
function getPlanKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🌱 Level 1: Beginner (₹100)', 'order_plan_level1')],
    [Markup.button.callback('📖 Level 2: Elementary (₹200)', 'order_plan_level2')],
    [Markup.button.callback('📊 Level 3: Intermediate (₹300)', 'order_plan_level3')],
    [Markup.button.callback('🚀 Level 4: Advance (₹400)', 'order_plan_level4')],
    [Markup.button.callback('⚡ Level 5: Accelerated (₹500)', 'order_plan_level5')],
    [Markup.button.callback('👑 ALL ACCESS — All 5 Levels (₹600) 🔥', 'order_plan_level_all')],
    [Markup.button.callback('❌ Cancel', 'cancel_order')]
  ]);
}

// ----------------------------------------------------
// 1. /start & Quick Commands (/ticket, /yesdaddy)
// ----------------------------------------------------
bot.command(['start', 'ticket', 'yesdaddy'], async (ctx) => {
  const name = ctx.from.first_name || 'Gorgeous';
  const isUserAdmin = isAdmin(ctx);

  const welcomeText =
    `👑 <b>SKILLDADDY ♡ YOUR PERSONAL SKILL HANDLER</b>\n\n` +
    `<i>“same girl... smarter, richer, colder ♡”</i>\n` +
    `<i>“Good Girls Learn Dirty Skills ✨”</i>\n\n` +
    `Welcome, <b>${escapeHtml(name)}</b>! ♡\n\n` +
    `Get your skills handled in <b>1 Day</b> with 100% safety & confidentiality.\n\n` +
    `🔒 <b>How it works:</b>\n` +
    `1️⃣ Choose your Plan & Pay via UPI QR\n` +
    `2️⃣ Submit your account ID & password (kept 100% private)\n` +
    `3️⃣ Get your Secret Codename and chat directly with Admin\n` +
    `4️⃣ Work completed within 24 hours!\n\n` +
    `👇 <b>Tap below to begin your private ticket:</b>`;

  await ctx.reply(welcomeText, { parse_mode: 'HTML', ...getMainMenuKeyboard(isUserAdmin) });
});

// Admin Dashboard Action & /admin Command
function sendAdminDashboard(ctx) {
  const adminWelcome =
    `👑 <b>SKILLDADDY ADMIN VAULT</b> ♡\n\n` +
    `Welcome Admin! Your system is active and ready.\n` +
    `📲 <b>Active UPI ID:</b> <code>${escapeHtml(config.upiId)}</code> (${escapeHtml(config.payeeName)})\n` +
    `🆔 <b>Admin Vault Chat ID:</b> <code>${escapeHtml(config.adminChatId)}</code>\n` +
    `📢 <b>Queue Channel:</b> <code>${escapeHtml(config.queueChannelId || 'Not connected')}</code>\n\n` +
    `🛠️ <b>Admin Commands:</b>\n` +
    `• <code>/setupi &lt;id&gt;</code> — Change UPI ID\n` +
    `• <code>/setadmin</code> — Bind this chat as Admin Vault\n` +
    `• <code>/postchannel @Channel</code> — Post & pin guide to channel\n` +
    `• <code>/syncqueue</code> — Force sync queue message\n\n` +
    `<i>💡 When a customer places an order or sends a message, you will receive full details here with 1-click action buttons and swipe-reply messaging!</i>`;

  const adminKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👑 Customer Order Menu', 'menu_main')],
    [Markup.button.callback('💳 View Payment QR', 'menu_pricing')]
  ]);

  return ctx.reply(adminWelcome, { parse_mode: 'HTML', ...adminKeyboard });
}

bot.command('admin', async (ctx) => {
  if (isAdmin(ctx)) {
    return sendAdminDashboard(ctx);
  }
  return ctx.reply('❌ Admin access only.');
});

bot.action('admin_dashboard', async (ctx) => {
  await ctx.answerCbQuery();
  return sendAdminDashboard(ctx);
});

bot.action('demo_customer_view', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `👑 <b>Customer Menu Preview:</b>`,
    { parse_mode: 'HTML', ...getMainMenuKeyboard(true) }
  );
});

// ----------------------------------------------------
// 2. Pricing & QR Code Display
// ----------------------------------------------------
async function sendPricingAndQr(ctx, isEdit = false) {
  const upiText =
    `💳 <b>SKILLDADDY — OFFICIAL PRICING & PAYMENT QR</b>\n\n` +
    `🌱 <b>Level 1: Beginner</b> — ₹100\n` +
    `📖 <b>Level 2: Elementary</b> — ₹200\n` +
    `📊 <b>Level 3: Intermediate</b> — ₹300\n` +
    `🚀 <b>Level 4: Advance</b> — ₹400\n` +
    `⚡ <b>Level 5: Accelerated</b> — ₹500\n` +
    `👑 <b>ALL ACCESS (All 5 Levels)</b> — <s>₹1500</s> <b>₹600</b> 🔥 <i>(BEST VALUE)</i>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📲 <b>UPI ID:</b> <code>${escapeHtml(config.upiId)}</code>\n` +
    `👤 <b>Name:</b> ${escapeHtml(config.payeeName)}\n` +
    `<i>(Tap the UPI ID above to copy it to clipboard)</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ <b>Turnaround:</b> Within 24 Hours\n` +
    `🔒 <b>Confidentiality:</b> 100% Guaranteed\n\n` +
    `👇 Scan the QR code or tap below to order:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Start Order / Open Private Ticket', 'flow_start')],
    [Markup.button.callback('🔙 Main Menu', 'menu_main')]
  ]);

  if (fs.existsSync(QR_PATH)) {
    try {
      await ctx.replyWithPhoto({ source: QR_PATH }, {
        caption: upiText,
        parse_mode: 'HTML',
        ...keyboard
      });
      return;
    } catch (err) {
      console.warn('Could not send QR image file:', err.message);
    }
  }

  // Fallback if image not found
  await ctx.reply(upiText, { parse_mode: 'HTML', ...keyboard });
}

bot.action('menu_pricing', async (ctx) => {
  await ctx.answerCbQuery();
  await sendPricingAndQr(ctx);
});

bot.action('menu_main', async (ctx) => {
  await ctx.answerCbQuery();
  const name = ctx.from.first_name || 'Gorgeous';
  await ctx.reply(
    `👑 <b>SKILLDADDY ♡ MAIN MENU</b>\n\nChoose an option below:`,
    { parse_mode: 'HTML', ...getMainMenuKeyboard() }
  );
});

// ----------------------------------------------------
// 3. Step-by-Step Order Wizard (Private Ticket Creation)
// ----------------------------------------------------
bot.action('flow_start', async (ctx) => {
  await ctx.answerCbQuery();
  const text =
    `🎯 <b>STEP 1/3: Choose Your Level / Plan</b>\n\n` +
    `Select which skill tier you want handled:`;

  await ctx.reply(text, { parse_mode: 'HTML', ...getPlanKeyboard() });
});

// Plan Selection -> Send QR Code for that specific plan
bot.action(/^order_plan_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const planKey = ctx.match[1];
  const planInfo = PLANS[planKey] || PLANS['level_all'];

  setSession(ctx.from.id, {
    step: 'awaiting_payment_confirm',
    plan: planInfo.name,
    price: planInfo.price
  });

  const payPrompt =
    `✅ <b>Selected Plan:</b> ${escapeHtml(planInfo.name)} (<b>${escapeHtml(planInfo.price)}</b>)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 <b>SCAN & PAY:</b>\n` +
    `📲 <b>UPI ID:</b> <code>${escapeHtml(config.upiId)}</code>\n` +
    `👤 <b>Name:</b> ${escapeHtml(config.payeeName)}\n` +
    `💰 <b>Amount:</b> ${escapeHtml(planInfo.price)}\n` +
    `<i>(Tap the UPI ID above to copy it)</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👇 <b>Once you have made the payment, tap the button below to submit your details & screenshot:</b>`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📸 I Have Paid — Submit Details', 'step_ask_id')],
    [Markup.button.callback('❌ Cancel Order', 'cancel_order')]
  ]);

  if (fs.existsSync(QR_PATH)) {
    try {
      await ctx.replyWithPhoto({ source: QR_PATH }, {
        caption: payPrompt,
        parse_mode: 'HTML',
        ...keyboard
      });
      return;
    } catch (e) {}
  }

  await ctx.reply(payPrompt, { parse_mode: 'HTML', ...keyboard });
});

bot.action('step_ask_id', async (ctx) => {
  await ctx.answerCbQuery();
  let session = getSession(ctx.from.id);
  if (!session) {
    session = { plan: 'Level 5: Accelerated', price: '₹500' };
  }

  session.step = 'awaiting_gmail';
  setSession(ctx.from.id, session);

  const text =
    `📧 <b>STEP 2/3: Account Login ID / Gmail</b>\n\n` +
    `Plan: <b>${escapeHtml(session.plan)}</b> (${escapeHtml(session.price)})\n\n` +
    `Please type and send your <b>Gmail Address or Account Username</b>:\n` +
    `<i>(e.g. yourname@gmail.com)</i>`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel Order', 'cancel_order')]])
  });
});

bot.action('cancel_order', async (ctx) => {
  await ctx.answerCbQuery('Order cancelled');
  setSession(ctx.from.id, null);
  await ctx.reply('❌ Draft cancelled. You can start over anytime ♡', getMainMenuKeyboard());
});

bot.command('cancel', async (ctx) => {
  const userId = ctx.from.id;
  const activeOrder = orders.find(o => o.userId === userId && o.status === 'in_queue');
  if (activeOrder) {
    return ctx.reply(
      `🔒 <b>Order Active in Queue</b>\n\n` +
      `Your task (<b>${escapeHtml(activeOrder.codename)}</b>) is verified and locked in our active queue.\n\n` +
      `⚠️ <i>Only the Admin can cancel an order once verified. Send a message here if you need assistance!</i>`,
      { parse_mode: 'HTML' }
    );
  }

  setSession(userId, null);
  await ctx.reply('❌ Current draft cancelled.', getMainMenuKeyboard());
});

// ----------------------------------------------------
// 4. Text Message Handler (Credentials & 2-Way Chat)
// ----------------------------------------------------
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  let session = getSession(userId);

  // Admin Swipe-Reply to Customer
  if (isAdmin(ctx) && ctx.message.reply_to_message) {
    const repliedText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
    const match = repliedText.match(/Customer ID:\s*(\d+)/i) || repliedText.match(/ID:\s*(\d+)/i);
    if (match) {
      const customerId = match[1];
      try {
        await ctx.telegram.sendMessage(
          customerId,
          `👑 <b>SkillDaddy Admin:</b>\n\n${escapeHtml(ctx.message.text)}`,
          { parse_mode: 'HTML' }
        );
        return ctx.reply(`✅ Message delivered to customer (${customerId}) anonymously!`);
      } catch (err) {
        return ctx.reply(`❌ Could not deliver message: ${err.message}`);
      }
    }
  }

  // Step 2: Awaiting Gmail / Username
  if (session && session.step === 'awaiting_gmail') {
    const input = ctx.message.text.trim();
    session.gmail = input;
    session.step = 'awaiting_password';
    setSession(userId, session);

    return ctx.reply(
      `🔑 <b>STEP 3/3: Account Password</b>\n\n` +
      `Account ID: <code>${escapeHtml(session.gmail)}</code>\n\n` +
      `Now, please send your <b>Account Password</b>:\n\n` +
      `🔒 <i>Your password is kept 100% confidential and is only visible to the Admin.</i>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'cancel_order')]])
      }
    );
  }

  // Step 3: Awaiting Password
  if (session && session.step === 'awaiting_password') {
    session.password = ctx.message.text.trim();
    session.step = 'awaiting_screenshot';
    setSession(userId, session);

    return ctx.reply(
      `📸 <b>FINAL STEP: Payment Screenshot</b>\n\n` +
      `Account ID: <code>${escapeHtml(session.gmail)}</code>\n` +
      `Password: <code>••••••••</code>\n\n` +
      `Now, please attach and send the <b>Screenshot / Photo</b> of your completed UPI payment:\n\n` +
      `👉 <i>Upload the screenshot image directly!</i>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'cancel_order')]])
      }
    );
  }

  // Fallback: If user types text while in awaiting_screenshot
  if (session && session.step === 'awaiting_screenshot') {
    return ctx.reply(
      `📸 <b>Payment Screenshot Needed:</b>\n\n` +
      `Account ID: <code>${escapeHtml(session.gmail)}</code>\n\n` +
      `👉 Please upload the <b>Screenshot image file</b> of your completed UPI payment directly!`,
      Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'cancel_order')]])
    );
  }

  // Fallback: If user typed an email directly without an active session
  if (ctx.message.text.includes('@') && ctx.message.text.includes('.')) {
    session = {
      step: 'awaiting_password',
      plan: 'Level 5: Accelerated',
      price: '₹500',
      gmail: ctx.message.text.trim()
    };
    setSession(userId, session);

    return ctx.reply(
      `🔑 <b>STEP 3/3: Account Password</b>\n\n` +
      `Account ID: <code>${escapeHtml(session.gmail)}</code>\n` +
      `Plan: <b>${escapeHtml(session.plan)} (${escapeHtml(session.price)})</b>\n\n` +
      `Now, please send your <b>Account Password</b>:\n\n` +
      `🔒 <i>Your password is kept 100% confidential and is only visible to the Admin.</i>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'cancel_order')]])
      }
    );
  }

  // If Admin typed normal text (not a reply to a customer)
  if (isAdmin(ctx)) {
    return ctx.reply(
      `👑 <b>Admin Notice:</b>\n` +
      `To open a test order ticket, tap <b>Open Private Ticket & Order</b> below.\n` +
      `To reply to a customer, swipe-reply to their alert message!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👑 Open Private Ticket & Order', 'flow_start')],
          [Markup.button.callback('⚙️ Admin Dashboard', 'admin_dashboard')]
        ])
      }
    );
  }

  // Non-Admin Customer Messaging Bot directly (Support chat forwarded to Admin Vault)
  if (!isAdmin(ctx)) {
    if (config.adminChatId) {
      const senderName = ctx.from.first_name || 'Customer';
      const senderHandle = ctx.from.username ? `@${ctx.from.username}` : 'No username';
      await ctx.telegram.sendMessage(
        config.adminChatId,
        `💬 <b>New Message from Customer!</b>\n\n` +
        `👤 <b>From:</b> ${escapeHtml(senderName)} (${escapeHtml(senderHandle)})\n` +
        `🆔 <b>Customer ID:</b> <code>${userId}</code>\n\n` +
        `📝 <b>Message:</b>\n${escapeHtml(ctx.message.text)}\n\n` +
        `<i>💡 Swipe-reply to this message to send an anonymous reply!</i>`,
        { parse_mode: 'HTML' }
      );
      await ctx.reply('💬 Your message has been sent to the Admin! We will reply right here shortly ♡');
    } else {
      await ctx.reply('👑 Welcome to SkillDaddy! Please run /start to place an order.', getMainMenuKeyboard());
    }
  }
});

// ----------------------------------------------------
// 5. Photo Handler (Screenshot Submission & Forwarding)
// ----------------------------------------------------
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  // If customer is completing their order
  if (session && session.step === 'awaiting_screenshot') {
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // highest resolution
    const codename = generateCodename();
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder = {
      orderId,
      codename,
      userId,
      userHandle: ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Customer'),
      plan: session.plan,
      price: session.price,
      gmail: session.gmail,
      password: session.password,
      photoFileId: photo.file_id,
      status: 'awaiting_verification',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    saveOrders();
    setSession(userId, null);

    // Confirmation message to user
    const userConfirm =
      `🎉 <b>PRIVATE TICKET CREATED & SUBMITTED!</b> ♡\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎭 <b>Secret Codename:</b> <code>${escapeHtml(codename)}</code>\n` +
      `📦 <b>Plan:</b> ${escapeHtml(session.plan)} (<b>${escapeHtml(session.price)}</b>)\n` +
      `📧 <b>Account ID:</b> <code>${escapeHtml(session.gmail)}</code>\n` +
      `⏳ <b>Status:</b> 🟡 <code>Payment Verification Pending</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔒 <b>What happens now?</b>\n` +
      `Our Admin is verifying your payment screenshot. Once approved, your task will be placed in the active queue and completed within 24 hours.\n\n` +
      `💬 <i>You can send a message right here anytime to chat with the Admin!</i>\n\n` +
      `<i>“same girl... smarter, richer, colder ♡”</i>`;

    await ctx.reply(userConfirm, { parse_mode: 'HTML', ...getMainMenuKeyboard() });

    // Send full dossier to Admin Vault
    if (config.adminChatId) {
      const adminCaption =
        `🔔 <b>NEW PRIVATE TICKET / ORDER RECEIVED!</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎭 <b>Codename:</b> <code>${escapeHtml(codename)}</code>\n` +
        `📦 <b>Plan:</b> ${escapeHtml(session.plan)} (<b>${escapeHtml(session.price)}</b>)\n` +
        `👤 <b>Client:</b> ${escapeHtml(newOrder.userHandle)}\n` +
        `🆔 <b>Customer ID:</b> <code>${userId}</code>\n` +
        `📧 <b>Account ID:</b> <code>${escapeHtml(session.gmail)}</code>\n` +
        `🔑 <b>Password:</b> <code>${escapeHtml(session.password)}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Review payment screenshot below and select action:`;

      const adminKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Verify & Add to Queue', `admin_accept_${orderId}`),
          Markup.button.callback('❌ Reject Order', `admin_cancel_${orderId}`)
        ],
        [
          Markup.button.callback('🎉 Mark Completed', `admin_complete_${orderId}`)
        ]
      ]);

      await ctx.telegram.sendPhoto(config.adminChatId, photo.file_id, {
        caption: adminCaption,
        parse_mode: 'HTML',
        ...adminKeyboard
      });
    }
  } else {
    // Non-order photo forwarded to Admin
    if (config.adminChatId && !isAdmin(ctx)) {
      const senderName = ctx.from.first_name || 'Customer';
      await ctx.telegram.sendPhoto(config.adminChatId, ctx.message.photo[ctx.message.photo.length - 1].file_id, {
        caption: `📸 <b>Photo from Customer:</b> ${escapeHtml(senderName)}\n🆔 Customer ID: <code>${userId}</code>`,
        parse_mode: 'HTML'
      });
      await ctx.reply('📸 Photo received and forwarded to Admin!');
    }
  }
});

// ----------------------------------------------------
// 6. Admin Action Handlers
// ----------------------------------------------------
bot.action(/^admin_accept_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return ctx.reply('❌ Order not found.');

  order.status = 'in_queue';
  saveOrders();

  // Notify Customer
  try {
    await ctx.telegram.sendMessage(
      order.userId,
      `✅ <b>PAYMENT VERIFIED & WORK STARTED!</b> 🎉\n\n` +
      `Your task (<b>${escapeHtml(order.codename)}</b> — ${escapeHtml(order.plan)}) has been verified and placed into the active queue!\n\n` +
      `⏱️ <b>Turnaround:</b> Within 24 hours.\n` +
      `🔒 <i>Your order is locked in queue. You will be notified here once completed ♡</i>`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {}

  // Update Admin Caption
  try {
    const originalCaption = ctx.callbackQuery.message.caption || '';
    await ctx.editMessageCaption(originalCaption + '\n\n✅ <b>[STATUS: ACCEPTED & IN QUEUE]</b>', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback('🎉 Mark Completed', `admin_complete_${orderId}`),
            Markup.button.callback('❌ Cancel Order', `admin_cancel_${orderId}`)
          ]
        ]
      }
    });
  } catch (e) {}

  await syncCustomerQueueChannel();
});

bot.action(/^admin_cancel_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return ctx.reply('❌ Order not found.');

  order.status = 'cancelled';
  saveOrders();

  // Notify Customer
  try {
    await ctx.telegram.sendMessage(
      order.userId,
      `❌ <b>ORDER CANCELLED BY ADMIN</b>\n\n` +
      `Your task <b>${escapeHtml(order.codename)}</b> has been cancelled.\n` +
      `Send a message right here if you have any questions or require assistance!`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {}

  try {
    const originalCaption = ctx.callbackQuery.message.caption || '';
    await ctx.editMessageCaption(originalCaption + '\n\n❌ <b>[STATUS: CANCELLED BY ADMIN]</b>', { parse_mode: 'HTML' });
  } catch (e) {}

  await syncCustomerQueueChannel();
});

bot.action(/^admin_complete_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return ctx.reply('❌ Order not found.');

  order.status = 'completed';
  saveOrders();

  // Notify Customer
  try {
    await ctx.telegram.sendMessage(
      order.userId,
      `👑 <b>TASK COMPLETED & DELIVERED!</b> 🎉\n\n` +
      `Your work for <b>${escapeHtml(order.codename)}</b> (${escapeHtml(order.plan)}) has been fully completed!\n\n` +
      `Check your account and enjoy leveling up ♡\n` +
      `Thank you for choosing SkillDaddy!\n\n` +
      `<i>“same girl... smarter, richer, colder ♡”</i>`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {}

  try {
    const originalCaption = ctx.callbackQuery.message.caption || '';
    await ctx.editMessageCaption(originalCaption + '\n\n👑 <b>[STATUS: DELIVERED & COMPLETED!]</b>', { parse_mode: 'HTML' });
  } catch (e) {}

  await syncCustomerQueueChannel();
});

// ----------------------------------------------------
// 7. Check Status & Contact Admin
// ----------------------------------------------------
bot.action('menu_status', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const userOrders = orders.filter(o => o.userId === userId);

  if (userOrders.length === 0) {
    return ctx.reply(
      '🔍 You have no active orders yet! Tap below to start your first order:',
      Markup.inlineKeyboard([[Markup.button.callback('🚀 Open Private Ticket', 'flow_start')]])
    );
  }

  let text = `🔍 <b>YOUR SKILLDADDY ORDERS:</b>\n\n`;
  userOrders.slice(-5).forEach(o => {
    let statusLabel = '🟡 Verification Pending';
    if (o.status === 'in_queue') statusLabel = '⚡ In Queue (Active)';
    if (o.status === 'completed') statusLabel = '👑 Completed';
    if (o.status === 'cancelled') statusLabel = '❌ Cancelled';

    text +=
      `🎭 <b>Codename:</b> <code>${escapeHtml(o.codename)}</code>\n` +
      `📦 <b>Plan:</b> ${escapeHtml(o.plan)}\n` +
      `📧 <b>Account:</b> <code>${escapeHtml(o.gmail)}</code>\n` +
      `⏳ <b>Status:</b> <b>${statusLabel}</b>\n\n`;
  });

  await ctx.reply(text, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
});

bot.action('menu_chat_admin', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `💬 <b>Direct Message to Admin:</b>\n\n` +
    `Simply type and send your question right here in this chat! It will be delivered directly to the Admin in private, and the Admin will reply to you here ♡`
  );
});

// ----------------------------------------------------
// 8. 1-Click Channel Forward Connector & Guide Generator
// ----------------------------------------------------
function getChannelGuideText() {
  return (
    `👑 <b>SKILLDADDY ♡ YOUR PERSONAL SKILL HANDLER</b>\n\n` +
    `<i>“same girl... smarter, richer, colder ♡”</i>\n` +
    `<i>“Good Girls Learn Dirty Skills ✨”</i>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👋 <b>WELCOME TO SKILLDADDY OFFICIAL!</b>\n` +
    `We handle your skill tasks, course levels, and account milestones with 100% confidentiality, high quality, and 24-hour turnaround.\n\n` +
    `📖 <b>AVAILABLE PLANS & PRICING:</b>\n` +
    `🌱 <b>Level 1: Beginner</b> — ₹100\n` +
    `📖 <b>Level 2: Elementary</b> — ₹200\n` +
    `📊 <b>Level 3: Intermediate</b> — ₹300\n` +
    `🚀 <b>Level 4: Advance</b> — ₹400\n` +
    `⚡ <b>Level 5: Accelerated</b> — ₹500\n` +
    `👑 <b>ALL ACCESS (All 5 Levels)</b> — <s>₹1500</s> <b>₹600</b> 🔥 <i>(BEST DEAL)</i>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 <b>HOW TO ORDER:</b>\n\n` +
    `1️⃣ Click <b>Start Order / Open Ticket</b> below to message @SkillDaddyBot.\n` +
    `2️⃣ Select your plan and pay via UPI: <code>${escapeHtml(config.upiId)}</code>\n` +
    `3️⃣ Send your Account ID & Password (kept 100% confidential).\n` +
    `4️⃣ Work completed within 24 hours!\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔒 <b>100% SAFE & CONFIDENTIAL</b>\n` +
    `👇 <b>Tap below to begin now:</b>`
  );
}

function getChannelGuideKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url('👑 Start Order / Open Private Ticket', 'https://t.me/SkillDaddyBot?start=order')],
    [Markup.button.url('📢 Official Telegram Channel', config.channelLink)]
  ]);
}

// Forwarded message from Channel Detector
bot.use(async (ctx, next) => {
  if (ctx.message && isAdmin(ctx)) {
    const fwdChat = ctx.message.forward_from_chat || 
                   (ctx.message.forward_origin?.type === 'channel' ? ctx.message.forward_origin.chat : null);

    if (fwdChat) {
      const channelId = fwdChat.id;
      const channelTitle = fwdChat.title || 'Your Channel';
      const channelUser = fwdChat.username ? `@${fwdChat.username}` : null;

      try {
        let sent;
        if (fs.existsSync(QR_PATH)) {
          sent = await bot.telegram.sendPhoto(channelId, { source: QR_PATH }, {
            caption: getChannelGuideText(),
            parse_mode: 'HTML',
            ...getChannelGuideKeyboard()
          });
        } else {
          sent = await bot.telegram.sendMessage(channelId, getChannelGuideText(), {
            parse_mode: 'HTML',
            ...getChannelGuideKeyboard()
          });
        }

        bot.telegram.pinChatMessage(channelId, sent.message_id).catch(() => {});

        config.queueChannelId = String(channelId);
        if (channelUser) {
          config.channelLink = `https://t.me/${fwdChat.username}`;
        }
        saveConfig();

        return ctx.reply(
          `🎉 <b>Channel Connected Successfully!</b>\n\n` +
          `📢 <b>Channel:</b> ${escapeHtml(channelTitle)}\n` +
          `🆔 <b>Channel ID:</b> <code>${channelId}</code>\n\n` +
          `✅ <b>The Master Guide & QR have been posted and pinned in your channel!</b>`,
          { parse_mode: 'HTML' }
        );
      } catch (err) {
        return ctx.reply(
          `❌ <b>Could not post to channel:</b> ${err.message}\n\n` +
          `⚠️ Make sure @SkillDaddyBot is an <b>Administrator</b> in <b>${escapeHtml(channelTitle)}</b> with "Post Messages" and "Pin Messages" enabled!`
        );
      }
    }
  }
  return next();
});

// Admin command: /postchannel
bot.command('postchannel', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const parts = ctx.message.text.trim().split(/\s+/);
  let targetChat = parts[1] || config.queueChannelId;

  if (!targetChat) {
    return ctx.reply(
      '⚠️ <b>How to connect your channel:</b>\n\n' +
      '👉 <b>Easiest:</b> Just <b>Forward ANY message</b> from your channel into this chat!\n' +
      '👉 <b>Or:</b> <code>/postchannel @YourChannelHandle</code>',
      { parse_mode: 'HTML' }
    );
  }

  if (targetChat && !targetChat.startsWith('@') && !targetChat.startsWith('-100')) {
    targetChat = `@${targetChat}`;
  }

  try {
    let sent;
    if (fs.existsSync(QR_PATH)) {
      sent = await bot.telegram.sendPhoto(targetChat, { source: QR_PATH }, {
        caption: getChannelGuideText(),
        parse_mode: 'HTML',
        ...getChannelGuideKeyboard()
      });
    } else {
      sent = await bot.telegram.sendMessage(targetChat, getChannelGuideText(), {
        parse_mode: 'HTML',
        ...getChannelGuideKeyboard()
      });
    }

    bot.telegram.pinChatMessage(targetChat, sent.message_id).catch(() => {});
    config.queueChannelId = String(targetChat);
    saveConfig();

    await ctx.reply(`✅ Master guide posted & pinned in ${escapeHtml(targetChat)}!`);
  } catch (err) {
    await ctx.reply(`❌ Could not post to channel: ${err.message}`);
  }
});

// Admin command: /setupi
bot.command('setupi', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 2) {
    return ctx.reply('⚠️ Usage: /setupi yourname@okaxis');
  }
  config.upiId = parts[1].trim();
  saveConfig();
  await ctx.reply(`✅ UPI ID updated to: ${config.upiId}`);
});

// Admin command: /setadmin
bot.command('setadmin', async (ctx) => {
  config.adminChatId = String(ctx.chat.id);
  saveConfig();
  await ctx.reply(`👑 Admin Vault Chat Bound Successfully! Chat ID: ${config.adminChatId}`);
});

// ----------------------------------------------------
// 9. Live Work Queue Channel Sync Helper
// ----------------------------------------------------
async function syncCustomerQueueChannel() {
  if (!config.queueChannelId) return;

  const activeOrders = orders.filter(o => o.status === 'in_queue');

  let queueText =
    `👑 <b>SKILLDADDY — LIVE WORK QUEUE</b> ♡\n\n` +
    `<i>“same girl... smarter, richer, colder ♡”</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (activeOrders.length === 0) {
    queueText +=
      `🚀 <b>Current Queue is Clear!</b>\n` +
      `Tap below to submit your task and get handled instantly!\n\n`;
  } else {
    activeOrders.forEach((o, index) => {
      const position = index + 1;
      const statusBadge = position === 1 ? '⚡ <b>IN PROGRESS</b>' : '📋 <b>QUEUED</b>';
      queueText +=
        `<b>#${position}</b> 🎭 <code>${escapeHtml(o.codename)}</code>\n` +
        `   📦 Plan: <b>${escapeHtml(o.plan)}</b>\n` +
        `   Status: ${statusBadge}\n\n`;
    });
  }

  queueText +=
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔒 <b>100% Confidential:</b> Real credentials are never shared.\n` +
    `⏱️ <i>Updated automatically in real-time ⚡</i>`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('👑 Start Order (@SkillDaddyBot)', 'https://t.me/SkillDaddyBot')]
  ]);

  try {
    if (config.queueMessageId) {
      await bot.telegram.editMessageText(
        config.queueChannelId,
        config.queueMessageId,
        undefined,
        queueText,
        { parse_mode: 'HTML', ...keyboard }
      );
    } else {
      const sent = await bot.telegram.sendMessage(
        config.queueChannelId,
        queueText,
        { parse_mode: 'HTML', ...keyboard }
      );
      config.queueMessageId = sent.message_id;
      saveConfig();
      bot.telegram.pinChatMessage(config.queueChannelId, sent.message_id).catch(() => {});
    }
  } catch (err) {
    try {
      const sent = await bot.telegram.sendMessage(
        config.queueChannelId,
        queueText,
        { parse_mode: 'HTML', ...keyboard }
      );
      config.queueMessageId = sent.message_id;
      saveConfig();
    } catch (e) {}
  }
}

bot.command('syncqueue', async (ctx) => {
  await syncCustomerQueueChannel();
  await ctx.reply('✅ Queue synced!');
});

// Launch Bot
function launchBot() {
  bot.launch({ dropPendingUpdates: true })
    .then(() => {
      console.log('[SkillDaddy Bot] Polling terminated cleanly.');
    })
    .catch((err) => {
      console.error(`[Telegram Launch Error]: ${err.message}. Retrying in 5 seconds...`);
      setTimeout(launchBot, 5000);
    });

  console.log(`===============================================`);
  console.log(`👑 SkillDaddy Telegram Bot is LIVE & POLLING!`);
  console.log(`🤖 Handle: @SkillDaddyBot`);
  console.log(`📲 UPI ID: ${config.upiId} (${config.payeeName})`);
  console.log(`===============================================`);

  if (config.queueChannelId) {
    syncCustomerQueueChannel();
  }
}

launchBot();

// Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
