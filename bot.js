/**
 * SkillDaddy Discord Bot ♡
 * Feature: Private Ticket creation via /yesDaddy (or button), private chat room with Admin,
 * and ONLY Admin can close the ticket.
 */

require('dotenv').config();
const http = require('http');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');

// Lightweight Health-Check Web Server (Required for free cloud hosts like Render & Koyeb)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('👑 SkillDaddy Discord Bot is Running! ♡');
}).listen(PORT, () => {
  console.log(`[Health Server] Listening for pings on port ${PORT}`);
});

// Configuration from .env
const TOKEN = process.env.DISCORD_TOKEN || '';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const GUILD_ID = process.env.DISCORD_GUILD_ID || ''; // Optional: for instant guild slash command updates
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID || '';
const CATEGORY_NAME = process.env.TICKET_CATEGORY_NAME || '💌 SKILLDADDY TICKETS';

// Theme Colors
const PINK_COLOR = 0xFF2D75;
const DARK_COLOR = 0x14141D;
const RED_COLOR = 0xEF4444;
const GREEN_COLOR = 0x10B981;

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Slash Commands Definition
const commands = [
  new SlashCommandBuilder()
    .setName('yesdaddy')
    .setDescription('Create a private confidential ticket room to submit details & chat with Admin ♡'),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close and delete this private ticket (Admin only)'),
  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post the SkillDaddy ticket panel button in this channel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('postrules')
    .setDescription('Post the official SkillDaddy server rules embed (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('postpayment')
    .setDescription('Post the official SkillDaddy pricing & payment QR guide (Admin only)')
    .addAttachmentOption(opt => opt.setName('qr_code').setDescription('Attach your UPI / Payment QR screenshot (Optional)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

/**
 * Register Slash Commands with Discord API
 */
async function registerCommands() {
  if (!TOKEN || !CLIENT_ID) {
    console.warn('[SkillDaddy Bot] DISCORD_TOKEN or DISCORD_CLIENT_ID missing in .env. Skipping slash command registration.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('[SkillDaddy Bot] Registering application slash commands...');
    if (GUILD_ID) {
      // Instant registration for specific guild (instant update)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`[SkillDaddy Bot] Guild slash commands registered for guild: ${GUILD_ID}`);
    } else {
      // Global registration
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('[SkillDaddy Bot] Global slash commands registered.');
    }
  } catch (error) {
    console.error('[SkillDaddy Bot] Error registering slash commands:', error);
  }
}

/**
 * Check if a guild member is an Admin or has permission to manage tickets
 */
function isMemberAdmin(member) {
  if (!member) return false;
  // Has Administrator permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  // Has Manage Channels permission
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  // Has configured Admin Role
  if (ADMIN_ROLE_ID && member.roles.cache.has(ADMIN_ROLE_ID)) return true;
  return false;
}

/**
 * Find or create the Tickets Category
 */
async function getOrCreateCategory(guild) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === CATEGORY_NAME.toLowerCase()
  );

  if (!category) {
    try {
      category = await guild.channels.create({
        name: CATEGORY_NAME,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      });
      console.log(`[SkillDaddy Bot] Created Category: ${category.name}`);
    } catch (err) {
      console.warn('[SkillDaddy Bot] Could not create category, creating channel in root:', err.message);
      return null;
    }
  }
  return category;
}

/**
 * Create a Private Ticket Channel for User
 */
async function createTicketChannel(guild, user) {
  // 1. Check if user already has an active open ticket channel
  const existingChannel = guild.channels.cache.find(c => {
    return (
      c.type === ChannelType.GuildText &&
      c.topic &&
      c.topic.includes(`Ticket owner: ${user.id}`)
    );
  });

  if (existingChannel) {
    return { error: 'already_exists', channel: existingChannel };
  }

  // 2. Get or create category
  const category = await getOrCreateCategory(guild);

  // 3. Permission Overwrites
  // Only the User, the Bot, and Admins can see the channel. @everyone is blocked!
  const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
  const channelName = `ticket-${cleanUsername}`;

  const permissionOverwrites = [
    // Deny @everyone
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    },
    // Allow User
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    // Allow Bot
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  // If custom Admin Role is defined, grant it view/send permissions
  if (ADMIN_ROLE_ID && guild.roles.cache.has(ADMIN_ROLE_ID)) {
    permissionOverwrites.push({
      id: ADMIN_ROLE_ID,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }

  // 4. Create Channel
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category ? category.id : null,
    topic: `Ticket owner: ${user.id} | Opened: ${new Date().toISOString()} | SkillDaddy Private Ticket`,
    permissionOverwrites
  });

  // 5. Send Welcome & Instruction Embed in the Ticket Channel
  const welcomeEmbed = new EmbedBuilder()
    .setColor(PINK_COLOR)
    .setTitle('👑 SkillDaddy — Private Confidential Ticket')
    .setDescription(
      `Hey <@${user.id}>! Your private chat room with the Admin has been created. ♡\n\n` +
      `**Please send the following details here to get started:**\n\n` +
      `📝 **1. Account Username / ID**\n` +
      `🔑 **2. Account Password**\n` +
      `🎯 **3. Selected Plan / Level:**\n` +
      `> • Level 1: Beginner (₹100)\n` +
      `> • Level 2: Elementary (₹200)\n` +
      `> • Level 3: Intermediate (₹300)\n` +
      `> • Level 4: Advance (₹400)\n` +
      `> • Level 5: Accelerated (₹500)\n` +
      `> • 👑 **All Access (All 5 Levels): ₹600**\n\n` +
      `📸 **4. Payment Proof / Screenshot** (Drop image directly in this chat)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔒 **Privacy:** Only you and the Admin can view this channel.\n` +
      `⚠️ **Closing:** *Only an Admin can close this ticket after completing your work.*`
    )
    .setFooter({ text: 'SkillDaddy ♡ Your Personal Skill Handler • Same Girl... Different Level' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket (Admin Only)')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId('view_plans')
      .setLabel('View Plans & UPI')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💳')
  );

  const adminPing = ADMIN_ROLE_ID ? `<@&${ADMIN_ROLE_ID}>` : '@here';
  await ticketChannel.send({
    content: `🔔 <@${user.id}> & ${adminPing} — A new private ticket has been initiated!`,
    embeds: [welcomeEmbed],
    components: [row]
  });

  return { success: true, channel: ticketChannel };
}

/**
 * Ready Event
 */
client.once('ready', async () => {
  console.log(`===============================================`);
  console.log(`👑 SkillDaddy Discord Bot is ONLINE!`);
  console.log(`🤖 Logged in as: ${client.user.tag} (ID: ${client.user.id})`);
  console.log(`🏰 Serving in ${client.guilds.cache.size} server(s)`);
  console.log(`===============================================`);

  // Auto-register slash commands
  await registerCommands();
});

/**
 * Handle Slash Commands & Interaction Events
 */
client.on('interactionCreate', async (interaction) => {
  try {
    // ----------------------------------------------------
    // 1. Slash Command: /yesdaddy
    // ----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'yesdaddy') {
      await interaction.deferReply({ ephemeral: true });

      const result = await createTicketChannel(interaction.guild, interaction.user);

      if (result.error === 'already_exists') {
        return interaction.editReply({
          content: `⚠️ You already have an active private ticket room open: <#${result.channel.id}>! Please continue your conversation there.`
        });
      }

      return interaction.editReply({
        content: `🎉 Your private ticket has been created! Click here to enter: <#${result.channel.id}> ♡`
      });
    }

    // ----------------------------------------------------
    // 2. Slash Command: /close
    // ----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'close') {
      const channel = interaction.channel;

      // Verify this is a ticket channel
      if (!channel.topic || !channel.topic.includes('SkillDaddy Private Ticket')) {
        return interaction.reply({
          content: '❌ This command can only be used inside a SkillDaddy ticket channel!',
          ephemeral: true
        });
      }

      // Check Admin Permissions
      if (!isMemberAdmin(interaction.member)) {
        return interaction.reply({
          content: '❌ **Permission Denied!** Only an Admin can close this ticket. Please wait until your task is completed.',
          ephemeral: true
        });
      }

      // Admin confirmed -> countdown and delete
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RED_COLOR)
            .setTitle('🔒 Ticket Closing')
            .setDescription(`Ticket closed by Admin <@${interaction.user.id}>.\nThis private channel will be deleted in **5 seconds**...`)
            .setTimestamp()
        ]
      });

      setTimeout(async () => {
        try {
          await channel.delete(`Ticket closed by admin ${interaction.user.tag}`);
        } catch (err) {
          console.error('[SkillDaddy Bot] Failed to delete channel:', err);
        }
      }, 5000);

      return;
    }

    // ----------------------------------------------------
    // 3. Slash Command: /ticketpanel (Admin only)
    // ----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'ticketpanel') {
      if (!isMemberAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ Only admins can post the ticket panel.', ephemeral: true });
      }

      const panelEmbed = new EmbedBuilder()
        .setColor(PINK_COLOR)
        .setTitle('👑 SkillDaddy — Need Work Done? Open A Private Room!')
        .setDescription(
          `Click the button below or type \`/yesDaddy\` to open a confidential private ticket.\n\n` +
          `• **Confidential:** Only you and Admin can view your room.\n` +
          `• **Share Credentials & Proof:** Drop your task ID/password and payment proof safely.\n` +
          `• **Fast Execution:** Handled directly by our operators.\n\n` +
          `*Same Girl... Different Level ♡*`
        )
        .setFooter({ text: 'SkillDaddy ♡ Your Personal Skill Handler' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_open_ticket')
          .setLabel('Yes Daddy ♡ Open Private Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👑')
      );

      await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
      return interaction.reply({ content: '✅ Ticket panel posted successfully!', ephemeral: true });
    }

    // ----------------------------------------------------
    // 4. Slash Command: /postrules (Admin only)
    // ----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'postrules') {
      if (!isMemberAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ Only admins can post the server rules.', ephemeral: true });
      }

      const rulesEmbed = new EmbedBuilder()
        .setColor(PINK_COLOR)
        .setTitle('👑 SKILLDADDY — OFFICIAL SERVER RULES ♡')
        .setDescription(
          `*“same girl... smarter, richer, colder ♡”*\n` +
          `*“Good Girls Learn Dirty Skills”*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**1️⃣ 🔒 CONFIDENTIALITY & PRIVACY FIRST**\n` +
          `> Never share your account passwords or personal credentials in public channels! Always type **\`/yesDaddy\`** to create an end-to-end private ticket room.\n\n` +
          `**2️⃣ 💳 RESPECT THE RATES & PROVIDE PROOF**\n` +
          `> All orders require verified payment proof (screenshot/transaction ID) dropped directly into your private ticket. No free requests or chargeback scams.\n\n` +
          `**3️⃣ ⏱️ QUEUE PROTOCOL & TURNAROUND**\n` +
          `> Turnaround is lightning-fast (**within 24 hours**). Please be patient and do not spam-ping admins while your task is being executed.\n\n` +
          `**4️⃣ 🚫 ZERO TOLERANCE POLICY**\n` +
          `> No harassment, scamming, sharing malicious files, or advertising competitors. Any malicious behavior leads to an immediate permanent ban.\n\n` +
          `**5️⃣ 🎟️ READY TO GET STARTED?**\n` +
          `> Run **\`/yesDaddy\`** anywhere or click the button below to open your private room with the Admin!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setFooter({ text: 'SkillDaddy ♡ Your Personal Skill Handler • Skills Are Sexy 💋' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_open_ticket')
          .setLabel('Yes Daddy ♡ Open Private Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👑')
      );

      await interaction.channel.send({ embeds: [rulesEmbed], components: [row] });
      return interaction.reply({ content: '✅ Official server rules posted!', ephemeral: true });
    }

    // ----------------------------------------------------
    // 5. Slash Command: /postpayment (Admin only)
    // ----------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'postpayment') {
      if (!isMemberAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ Only admins can post the payment guide.', ephemeral: true });
      }

      const qrAttachment = interaction.options.getAttachment('qr_code');

      const paymentEmbed = new EmbedBuilder()
        .setColor(PINK_COLOR)
        .setTitle('💳 SKILLDADDY — OFFICIAL PRICING & PAYMENT GUIDE')
        .setDescription(
          `**Choose your level and scan to pay:**\n\n` +
          `🌱 **1. Beginner** — ₹100 *(Let's get you started)*\n` +
          `📖 **2. Elementary** — ₹200 *(Build the basics)*\n` +
          `📊 **3. Intermediate** — ₹300 *(Get things serious)*\n` +
          `🚀 **4. Advance** — ₹400 *(Level up your game)*\n` +
          `⚡ **5. Accelerated** — ₹500 *(For the real ones)*\n\n` +
          `👑 **ALL ACCESS (All 5 Levels at Once)** — ~~₹1500~~ **₹600** 🔥 *(BEST DEAL)*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📲 **UPI ID:** \`extreme4hollywood@gmail.com\` *(or scan QR below)*\n` +
          `📸 **Next Step:** Run **\`/yesDaddy\`** to create your private room and drop your screenshot!\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setFooter({ text: 'SkillDaddy ♡ Complete Your Goal in 1 Day • 100% Safe & Confidential' });

      if (qrAttachment) {
        paymentEmbed.setImage(qrAttachment.url);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_open_ticket')
          .setLabel('Yes Daddy ♡ Open Private Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👑')
      );

      await interaction.channel.send({ embeds: [paymentEmbed], components: [row] });
      return interaction.reply({ content: '✅ Payment guide posted!', ephemeral: true });
    }

    // ----------------------------------------------------
    // 4. Button Interactions
    // ----------------------------------------------------
    if (interaction.isButton()) {
      // Button: Open Ticket
      if (interaction.customId === 'btn_open_ticket') {
        await interaction.deferReply({ ephemeral: true });
        const result = await createTicketChannel(interaction.guild, interaction.user);

        if (result.error === 'already_exists') {
          return interaction.editReply({
            content: `⚠️ You already have an active ticket room open: <#${result.channel.id}>!`
          });
        }

        return interaction.editReply({
          content: `🎉 Your private ticket room is ready: <#${result.channel.id}> ♡`
        });
      }

      // Button: Close Ticket (Admin Only!)
      if (interaction.customId === 'close_ticket') {
        // Strict Admin Check!
        if (!isMemberAdmin(interaction.member)) {
          return interaction.reply({
            content: '❌ **Permission Denied!** Only an Admin can close this ticket. Please wait for the admin to complete your task.',
            ephemeral: true
          });
        }

        const channel = interaction.channel;
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(RED_COLOR)
              .setTitle('🔒 Ticket Closing')
              .setDescription(`Ticket closed by Admin <@${interaction.user.id}>.\nThis room will automatically delete in **5 seconds**...`)
              .setTimestamp()
          ]
        });

        setTimeout(async () => {
          try {
            await channel.delete(`Ticket closed by admin ${interaction.user.tag}`);
          } catch (err) {
            console.error('[SkillDaddy Bot] Failed to delete channel:', err);
          }
        }, 5000);

        return;
      }

      // Button: View Plans & Pricing Info
      if (interaction.customId === 'view_plans') {
        const planEmbed = new EmbedBuilder()
          .setColor(PINK_COLOR)
          .setTitle('💳 SkillDaddy — Official Plans & Pricing')
          .setDescription(
            `**Choose your level below:**\n\n` +
            `🌱 **Level 1: Beginner** — ₹100\n*Let's get you started*\n\n` +
            `📖 **Level 2: Elementary** — ₹200\n*Build the basics*\n\n` +
            `📊 **Level 3: Intermediate** — ₹300\n*Get things serious*\n\n` +
            `🚀 **Level 4: Advance** — ₹400\n*Level up your game*\n\n` +
            `⚡ **Level 5: Accelerated** — ₹500\n*For the real ones*\n\n` +
            `👑 **ALL ACCESS (All 5 Levels at Once)** — ~~₹1500~~ **₹600** *(BEST DEAL)*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**Payment:** Scan the QR code or send payment, then upload screenshot right here in this room!\n` +
            `*Contact Email:* \`extreme4hollywood@gmail.com\``
          );

        return interaction.reply({ embeds: [planEmbed], ephemeral: true });
      }
    }
  } catch (error) {
    console.error('[SkillDaddy Bot] Interaction error:', error);
    if (interaction.deferred || interaction.replied) {
      interaction.followUp({ content: '⚠️ An error occurred while executing this command.', ephemeral: true }).catch(() => {});
    } else {
      interaction.reply({ content: '⚠️ An error occurred while executing this command.', ephemeral: true }).catch(() => {});
    }
  }
});

/**
 * Handle Message Text Commands (Fallback for !yesDaddy, !yesdaddy, or /yesDaddy as text)
 */
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim().toLowerCase();

  // If user types !yesdaddy, !yesdaddy, or /yesdaddy in normal chat
  if (content === '!yesdaddy' || content === '!yesdaddy' || content === '/yesdaddy' || content === '!ticket') {
    try {
      const result = await createTicketChannel(message.guild, message.author);

      if (result.error === 'already_exists') {
        return message.reply(`⚠️ You already have an open ticket channel: <#${result.channel.id}>!`);
      }

      return message.reply(`🎉 Private ticket created! Go to <#${result.channel.id}> to chat with Admin ♡`);
    } catch (err) {
      console.error('[SkillDaddy Bot] Message command error:', err);
      message.reply('⚠️ Error creating ticket channel. Please make sure the bot has `Manage Channels` permission!').catch(() => {});
    }
  }

  // Admin text commands: !postrules
  if (content === '!postrules' && isMemberAdmin(message.member)) {
    const rulesEmbed = new EmbedBuilder()
      .setColor(PINK_COLOR)
      .setTitle('👑 SKILLDADDY — OFFICIAL SERVER RULES ♡')
      .setDescription(
        `*“same girl... smarter, richer, colder ♡”*\n` +
        `*“Good Girls Learn Dirty Skills”*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**1️⃣ 🔒 CONFIDENTIALITY & PRIVACY FIRST**\n` +
        `> Never share account passwords or sensitive details in public chat! Always use **\`!yesDaddy\`** to open an encrypted private ticket.\n\n` +
        `**2️⃣ 💳 RESPECT THE RATES & PROOF REQUIRED**\n` +
        `> All orders require verified payment proof (screenshot/transaction ID) dropped directly into your private ticket. No free requests.\n\n` +
        `**3️⃣ ⏱️ QUEUE PROTOCOL & TURNAROUND**\n` +
        `> Fast turnarounds (**within 24 hours**). Please be patient and avoid spamming admins while your task is in progress.\n\n` +
        `**4️⃣ 🚫 ZERO TOLERANCE POLICY**\n` +
        `> No harassment, scamming, sharing malicious links, or advertising competitors. Immediate permanent ban for violations.\n\n` +
        `**5️⃣ 🎟️ READY TO GET STARTED?**\n` +
        `> Type **\`!yesDaddy\`** anywhere or click the button below to open your room!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: 'SkillDaddy ♡ Your Personal Skill Handler • Skills Are Sexy 💋' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_open_ticket')
        .setLabel('Yes Daddy ♡ Open Private Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👑')
    );

    await message.channel.send({ embeds: [rulesEmbed], components: [row] });
    message.delete().catch(() => {});
  }

  // Admin text commands: !postpayment
  if (content === '!postpayment' && isMemberAdmin(message.member)) {
    const paymentEmbed = new EmbedBuilder()
      .setColor(PINK_COLOR)
      .setTitle('💳 SKILLDADDY — OFFICIAL PRICING & PAYMENT GUIDE')
      .setDescription(
        `**Choose your level and scan to pay:**\n\n` +
        `🌱 **1. Beginner** — ₹100 *(Let's get you started)*\n` +
        `📖 **2. Elementary** — ₹200 *(Build the basics)*\n` +
        `📊 **3. Intermediate** — ₹300 *(Get things serious)*\n` +
        `🚀 **4. Advance** — ₹400 *(Level up your game)*\n` +
        `⚡ **5. Accelerated** — ₹500 *(For the real ones)*\n\n` +
        `👑 **ALL ACCESS (All 5 Levels at Once)** — ~~₹1500~~ **₹600** 🔥 *(BEST DEAL)*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📲 **UPI ID:** \`extreme4hollywood@gmail.com\` / \`skilldaddy@upi\`\n` +
        `📸 **Next Step:** Run **\`!yesDaddy\`** to create your private room and drop your screenshot!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: 'SkillDaddy ♡ Complete Your Goal in 1 Day • 100% Safe & Confidential' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_open_ticket')
        .setLabel('Submit Payment & Credentials (/yesDaddy)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👑')
    );

    await message.channel.send({ embeds: [paymentEmbed], components: [row] });
    message.delete().catch(() => {});
  }
});

// Start the Bot
if (TOKEN) {
  client.login(TOKEN).catch((err) => {
    console.error('❌ Failed to login to Discord! Check your DISCORD_TOKEN in .env:', err.message);
  });
} else {
  console.log('⚠️ DISCORD_TOKEN is not yet set in .env! Add your bot token to start the bot.');
}

module.exports = client;
