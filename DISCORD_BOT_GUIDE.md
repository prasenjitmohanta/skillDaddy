# 👑 SkillDaddy Discord Bot — Setup & Usage Guide

This Discord bot implements the private ticket system for your business:
- **Command:** `/yesDaddy` (or `!yesDaddy` / `!yesdaddy`)
- **Action:** Creates an **end-to-end private ticket channel** between the user and Admin.
- **Admin Control:** **Only the Admin can close the ticket** (non-admins receive a permission-denied notice).
- **Branding:** SkillDaddy dark & neon-pink styling, welcome embed, plan details, and UPI info.

---

## 🛠️ Step 1: Create Your Discord Bot (2 Minutes)

1. Go to the **[Discord Developer Portal](https://discord.com/developers/applications)**.
2. Click **"New Application"** (top right) and name it **SkillDaddy** (or whatever you like).
3. Under **General Information**:
   - Copy your **APPLICATION ID** (this is your `DISCORD_CLIENT_ID`).
4. Go to the **"Bot"** tab on the left:
   - Click **"Reset Token"** (or "View Token") and copy the token (this is your `DISCORD_TOKEN`).
   - Scroll down to **Privileged Gateway Intents** and enable:
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
   - Click **Save Changes**.

---

## 🔗 Step 2: Invite Bot to Your Discord Server

1. In the Developer Portal, go to **OAuth2** → **URL Generator** on the left menu.
2. Under **SCOPES**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **BOT PERMISSIONS**, select:
   - ✅ `Administrator` *(recommended for easy full permission management)*
   *(Or at minimum: `Manage Channels`, `View Channels`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`)*.
4. Copy the **Generated URL** at the bottom.
5. Paste it in your browser and invite the bot to your server (**Xtreme Xone's server**).

---

## ⚙️ Step 3: Configure `.env`

Open `/Users/prasenjit/Desktop/Sdaddy/.env` and fill in your Discord credentials:

```env
DISCORD_TOKEN=your_copied_bot_token_here
DISCORD_CLIENT_ID=your_copied_application_id_here
DISCORD_GUILD_ID=          # Optional: your Server ID for instant command updates
DISCORD_ADMIN_ROLE_ID=     # Optional: Role ID of your Admin/Staff role
TICKET_CATEGORY_NAME=💌 SKILLDADDY TICKETS
```

> **Tip:** If you fill in `DISCORD_GUILD_ID` (Right click your server in Discord → "Copy Server ID"), slash commands update **instantly** in your server instead of waiting for global Discord cache.

---

## 🚀 Step 4: Run the Bot

Open terminal in `/Users/prasenjit/Desktop/Sdaddy` and run:

```bash
npm run bot
```

You will see:
```text
===============================================
👑 SkillDaddy Discord Bot is ONLINE!
🤖 Logged in as: SkillDaddy#1234
🏰 Serving in 1 server(s)
===============================================
```

---

## 🎮 Commands & Features

### 1. `/yesDaddy` (or `/yesdaddy` / `!yesDaddy`)
- Any member can run this command.
- The bot creates a private channel named `ticket-username` under category `💌 SKILLDADDY TICKETS`.
- **Channel Permissions:**
  - `@everyone`: Blocked (`ViewChannel: false`).
  - **Ticket Owner:** Can view, chat, and upload screenshots.
  - **Admin/Staff:** Can view, chat, and manage.
- Sends a neon-pink embed asking for:
  1. Username / ID credentials
  2. Account Password
  3. Plan / Level
  4. Payment Screenshot

### 2. 🔒 Closing the Ticket
- Users and admins can see the **"Close Ticket (Admin Only)"** button.
- If a normal user clicks it, the bot blocks them:
  > *❌ **Permission Denied!** Only an Admin can close this ticket.*
- When an **Admin** clicks it (or runs `/close`):
  > *🔒 Ticket closed by Admin. Deleting room in 5 seconds...*
  and the channel deletes itself cleanly.

### 3. `/ticketpanel` (Admin Only)
- Run `/ticketpanel` in a public channel (e.g. `#create-ticket` or `#start-here`).
- The bot posts a permanent interactive embed with a **"Yes Daddy ♡ Open Private Ticket"** button.
- Anyone who clicks that button gets their private ticket created automatically!
