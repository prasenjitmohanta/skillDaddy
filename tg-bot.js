/**
 * SkillDaddy Telegram Bot ♡
 * 
 * Flow:
 * 1. Customer lands on bot -> Welcomed with branded SkillDaddy aesthetics.
 * 2. Instructs customer to contact the Admin via Official Discord server.
 * 3. Provides 1-click Discord invite button: https://discord.gg/xhWTS5csKZ
 * 4. Tells them to run /yesDaddy in Discord to open a private 1-on-1 room with Admin.
 * 5. Notifies Admin Vault in Telegram whenever a customer visits or messages.
 * 6. Admin can swipe-reply to customer alerts to send anonymous Telegram replies if desired.
 * 7. Full Admin commands preserved (/setdiscord, /setupi, /setadmin, /setqueue, /syncqueue).
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

// Config Storage (Persists Admin Group, Queue Channel, UPI ID, Discord link)
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  adminChatId: process.env.TELEGRAM_ADMIN_ID ? String(process.env.TELEGRAM_ADMIN_ID).trim() : '1793240180',
  queueChannelId: '',
  queueMessageId: null,
  upiId: process.env.UPI_ID || 'extreme4hollywood@gmail.com',
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

// Global error handler so bot never crashes on Telegram entity errors
bot.catch((err, ctx) => {
  console.error(`[SkillDaddy Bot] Handled error in ${ctx?.updateType}:`, err.message);
});

// Branded Message & Keyboards for Discord Redirection
function getDiscordRedirectMessage(name = 'there') {
  return (
    `👑 <b>SKILLDADDY ♡ YOUR PERSONAL SKILL HANDLER</b>\n\n` +
    `<i>“same girl... smarter, richer, colder ♡”</i>\n` +
    `<i>“Good Girls Learn Dirty Skills ✨”</i>\n\n` +
    `Hey ${escapeHtml(name)}! ♡\n\n` +
    `To place an order, get your skills handled, or speak directly with the <b>Admin</b>, please connect with us on our official <b>Discord Server</b>!\n\n` +
    `🔒 <b>Why Discord?</b>\n` +
    `• 🎟️ Run <code>/yesDaddy</code> in Discord to open a 1-on-1 confidential ticket room\n` +
    `• 💬 Chat directly with the Admin in 100% privacy\n` +
    `• 📸 Safely drop your account details & payment screenshot\n` +
    `• ⚡ Lightning-fast turnaround (within 24 hours!)\n\n` +
    `👇 <b>Click below to join Discord and message the Admin now:</b>`
  );
}

function getDiscordRedirectKeyboard() {
  const discordUrl = config.discordLink || process.env.DISCORD_INVITE_LINK || 'https://discord.gg/xhWTS5csKZ';
  const channelUrl = config.channelLink || 'https://t.me/SkillDaddyOfficial';

  return Markup.inlineKeyboard([
    [Markup.button.url('🎮 Join Discord & Contact Admin ♡', discordUrl)],
    [Markup.button.url('📢 Official Telegram Channel', channelUrl)]
  ]);
}

// ----------------------------------------------------
// 1. /start Handler
// ----------------------------------------------------
bot.command('start', async (ctx) => {
  const name = ctx.from.first_name || 'Gorgeous';

  // Admin View
  if (isAdmin(ctx)) {
    const adminWelcome =
      `👑 <b>SKILLDADDY ADMIN VAULT</b> ♡\n\n` +
      `Welcome Admin! Your bot is currently redirecting all visitors to Discord:\n` +
      `🔗 <b>Discord Invite:</b> <code>${escapeHtml(config.discordLink)}</code>\n` +
      `📲 <b>UPI ID:</b> <code>${escapeHtml(config.upiId)}</code>\n` +
      `🆔 <b>Admin Vault Chat ID:</b> <code>${escapeHtml(config.adminChatId)}</code>\n\n` +
      `🛠️ <b>Quick Admin Commands:</b>\n` +
      `• <code>/setdiscord &lt;url&gt;</code> — Change Discord Invite link\n` +
      `• <code>/setupi &lt;id&gt;</code> — Change UPI ID\n` +
      `• <code>/setadmin</code> — Bind this chat as Admin Vault\n` +
      `• <code>/setqueue</code> — Bind customer live queue channel\n` +
      `• <code>/syncqueue</code> — Force sync queue message\n\n` +
      `<i>💡 When a customer messages the bot, an alert will be sent here. You can swipe-reply to message them anonymously!</i>`;

    const adminKeyboard = Markup.inlineKeyboard([
      [Markup.button.url('🎮 Open Discord Server', config.discordLink)],
      [Markup.button.callback('👁️ Preview Customer View', 'preview_customer')]
    ]);

    return ctx.reply(adminWelcome, { parse_mode: 'HTML', ...adminKeyboard });
  }

  // Customer View -> Send Discord Redirection
  await ctx.reply(getDiscordRedirectMessage(name), {
    parse_mode: 'HTML',
    ...getDiscordRedirectKeyboard()
  });

  // Notify Admin Vault of New Visitor
  if (config.adminChatId && String(ctx.chat.id) !== config.adminChatId) {
    const userHandle = ctx.from.username ? `@${ctx.from.username}` : 'No username';
    ctx.telegram.sendMessage(
      config.adminChatId,
      `🔔 <b>New Visitor on @SkillDaddyBot!</b>\n\n` +
      `👤 <b>Name:</b> ${escapeHtml(name)} (${escapeHtml(userHandle)})\n` +
      `🆔 <b>Customer ID:</b> <code>${ctx.from.id}</code>\n\n` +
      `👉 <i>Customer was directed to Discord: ${escapeHtml(config.discordLink)}</i>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }
});

// Preview Customer View (Admin Action)
bot.action('preview_customer', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(getDiscordRedirectMessage('Customer Preview'), {
    parse_mode: 'HTML',
    ...getDiscordRedirectKeyboard()
  });
});

// ----------------------------------------------------
// 2. Admin Management Commands
// ----------------------------------------------------

// Update Discord Invite Link
bot.command('setdiscord', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 2) {
    return ctx.reply('⚠️ Usage: /setdiscord https://discord.gg/xhWTS5csKZ');
  }

  config.discordLink = parts[1].trim();
  saveConfig();
  await ctx.reply(`✅ Discord Invite Link updated to: ${config.discordLink}`);
});

// Bind Admin Vault
bot.command('setadmin', async (ctx) => {
  config.adminChatId = String(ctx.chat.id);
  saveConfig();
  await ctx.reply(
    `👑 Admin Vault Chat Bound Successfully!\n\n` +
    `Chat ID: ${config.adminChatId}\n` +
    `Customer alerts and messages will be sent to this chat!`
  );
});

// Update UPI ID dynamically
bot.command('setupi', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ Only Admin can update the UPI ID.');
  }

  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 2) {
    return ctx.reply('⚠️ Usage: /setupi yourname@upi');
  }

  config.upiId = parts[1].trim();
  saveConfig();
  await ctx.reply(`✅ UPI ID updated successfully to: ${config.upiId}`);
});

// Bind Customer Showcase / Queue Channel
bot.command('setqueue', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ Only Admin can bind the queue channel.');
  }

  config.queueChannelId = String(ctx.chat.id);
  config.queueMessageId = null;
  saveConfig();

  await ctx.reply('✅ This channel is now bound as the Customer Live Queue Channel! Syncing queue now...');
  await syncCustomerQueueChannel();
});

// Force sync queue
bot.command('syncqueue', async (ctx) => {
  await syncCustomerQueueChannel();
  await ctx.reply('✅ Customer queue channel synchronized!');
});

// Admin Help
bot.command('help', async (ctx) => {
  if (isAdmin(ctx)) {
    return ctx.reply(
      `👑 <b>SkillDaddy Admin Commands:</b>\n\n` +
      `• <code>/setdiscord &lt;url&gt;</code> — Set Discord Invite Link\n` +
      `• <code>/setupi &lt;id&gt;</code> — Update UPI ID\n` +
      `• <code>/setadmin</code> — Bind this chat as Admin Vault\n` +
      `• <code>/setqueue</code> — Bind customer live queue channel\n` +
      `• <code>/syncqueue</code> — Force sync queue message\n` +
      `• <i>Swipe-reply to any customer alert message to reply directly!</i>`,
      { parse_mode: 'HTML' }
    );
  }

  await ctx.reply(getDiscordRedirectMessage(ctx.from?.first_name), {
    parse_mode: 'HTML',
    ...getDiscordRedirectKeyboard()
  });
});

// ----------------------------------------------------
// 3. Customer Text & Media Handlers -> Send to Discord
// ----------------------------------------------------
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;

  // Admin Swipe-Reply to Customer Alert
  if (isAdmin(ctx) && ctx.message.reply_to_message) {
    const repliedText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
    const match = repliedText.match(/Customer ID:\s*(\d+)/i) || repliedText.match(/ID:\s*(\d+)/i);
    if (match) {
      const customerId = match[1];
      try {
        await ctx.telegram.sendMessage(
          customerId,
          `👑 <b>SkillDaddy Admin Reply:</b>\n\n${escapeHtml(ctx.message.text)}\n\n` +
          `👉 Please join our official Discord to continue: ${config.discordLink}`,
          { parse_mode: 'HTML', ...getDiscordRedirectKeyboard() }
        );
        return ctx.reply(`✅ Anonymous reply delivered to customer (ID: ${customerId})!`);
      } catch (err) {
        return ctx.reply(`❌ Could not deliver reply: ${err.message}`);
      }
    }
  }

  // If Admin is chatting in Admin Vault without reply
  if (isAdmin(ctx)) {
    return;
  }

  // Customer sent a text message -> Tell them to contact admin & send to Discord!
  const name = ctx.from.first_name || 'Gorgeous';
  await ctx.reply(
    `👑 <b>Hi ${escapeHtml(name)}!</b> ♡\n\n` +
    `To speak directly with the <b>Admin</b> and get your request handled, please join our official <b>Discord Server</b>!\n\n` +
    `All orders, inquiries, and private credentials are processed exclusively via private tickets on Discord (<code>/yesDaddy</code>).\n\n` +
    `👇 <b>Click below to join Discord and message the Admin now:</b>`,
    { parse_mode: 'HTML', ...getDiscordRedirectKeyboard() }
  );

  // Notify Admin Vault
  if (config.adminChatId) {
    const userHandle = ctx.from.username ? `@${ctx.from.username}` : 'No username';
    ctx.telegram.sendMessage(
      config.adminChatId,
      `💬 <b>New Customer Message!</b>\n\n` +
      `👤 <b>From:</b> ${escapeHtml(name)} (${escapeHtml(userHandle)})\n` +
      `🆔 <b>Customer ID:</b> <code>${userId}</code>\n\n` +
      `📝 <b>Message:</b>\n${escapeHtml(ctx.message.text)}\n\n` +
      `<i>💡 Customer was redirected to Discord. Swipe-reply to this message to send an anonymous reply on Telegram!</i>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }
});

// When customer sends photos or files -> Direct to Discord & notify Admin
bot.on(['photo', 'document', 'audio', 'voice', 'video', 'sticker'], async (ctx) => {
  if (isAdmin(ctx)) return;

  const name = ctx.from.first_name || 'Gorgeous';
  await ctx.reply(
    `📸 <b>Thank you, ${escapeHtml(name)}!</b>\n\n` +
    `To submit payment screenshots, credentials, or tasks to the Admin, please join our official <b>Discord Server</b> and open a private room using <code>/yesDaddy</code>!\n\n` +
    `👇 <b>Click below to join Discord & contact Admin:</b>`,
    { parse_mode: 'HTML', ...getDiscordRedirectKeyboard() }
  );

  // Forward to Admin Vault
  if (config.adminChatId) {
    const userHandle = ctx.from.username ? `@${ctx.from.username}` : 'No username';
    const caption =
      `📸 <b>Customer Media Received!</b>\n\n` +
      `👤 <b>From:</b> ${escapeHtml(name)} (${escapeHtml(userHandle)})\n` +
      `🆔 <b>Customer ID:</b> <code>${ctx.from.id}</code>\n\n` +
      `<i>Customer was redirected to Discord!</i>`;

    if (ctx.message.photo) {
      const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      ctx.telegram.sendPhoto(config.adminChatId, photoId, { caption, parse_mode: 'HTML' }).catch(() => {});
    } else {
      ctx.telegram.sendMessage(config.adminChatId, caption, { parse_mode: 'HTML' }).catch(() => {});
    }
  }
});

// ----------------------------------------------------
// 4. Live Queue Channel Sync Helper
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
      `Join our Discord to submit your task and get handled instantly!\n\n`;
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
    `👉 <b>To open a private ticket:</b> Join Discord (${config.discordLink})\n` +
    `⏱️ <i>Updated automatically in real-time ⚡</i>`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('🎮 Join Discord & Contact Admin', config.discordLink)],
    [Markup.button.url('🚀 Telegram Bot (@SkillDaddyBot)', 'https://t.me/SkillDaddyBot')]
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
    } catch (e) {
      console.warn('[Queue Sync] Could not post to queue channel:', e.message);
    }
  }
}

// ----------------------------------------------------
// 5. Admin Order Actions (Syncing & Verification)
// ----------------------------------------------------
bot.action(/^admin_accept_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return ctx.reply('❌ Order not found.');

  order.status = 'in_queue';
  saveOrders();

  try {
    await ctx.telegram.sendMessage(
      order.userId,
      `✅ <b>PAYMENT VERIFIED!</b> 🎉\n\n` +
      `Your task (<b>${escapeHtml(order.codename)}</b>) has been added to the queue!\n` +
      `Turnaround: within 24 hours. Connect with Admin on Discord anytime: ${config.discordLink}`,
      { parse_mode: 'HTML', ...getDiscordRedirectKeyboard() }
    );
  } catch (err) {}

  await syncCustomerQueueChannel();
});

bot.action(/^admin_cancel_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return ctx.reply('❌ Order not found.');

  order.status = 'cancelled';
  saveOrders();

  try {
    await ctx.telegram.sendMessage(
      order.userId,
      `❌ <b>ORDER CANCELLED BY ADMIN</b>\n\n` +
      `Please contact the Admin on Discord for assistance: ${config.discordLink}`,
      { parse_mode: 'HTML', ...getDiscordRedirectKeyboard() }
    );
  } catch (err) {}

  await syncCustomerQueueChannel();
});

bot.action(/^admin_complete_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return ctx.reply('❌ Order not found.');

  order.status = 'completed';
  saveOrders();

  try {
    await ctx.telegram.sendMessage(
      order.userId,
      `👑 <b>TASK COMPLETED!</b> 🎉\n\n` +
      `Your task (<b>${escapeHtml(order.codename)}</b>) is finished! Enjoy leveling up ♡\n` +
      `<i>Same Girl... Different Level ♡</i>`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {}

  await syncCustomerQueueChannel();
});

// Launch Bot
bot.launch({ dropPendingUpdates: true });
console.log(`===============================================`);
console.log(`👑 SkillDaddy Telegram Bot is LIVE & POLLING!`);
console.log(`🤖 Handle: @SkillDaddyBot`);
console.log(`🔗 Discord Link: ${config.discordLink}`);
console.log(`===============================================`);

// Initial queue sync if channel is already configured
if (config.queueChannelId) {
  syncCustomerQueueChannel();
}

// Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
