# SkillDaddy Discord Bot 👑

> *“same girl... smarter, richer, colder ♡”*
> *Your Personal Skill Handler*

A private ticket & verification Discord bot built with `discord.js` v14.

## Features
- **`/yesDaddy`** (or `!yesDaddy`): Opens an end-to-end confidential private ticket room.
- **🔒 Admin-Only Closing**: Only server administrators can close/delete tickets.
- **`!postrules` / `/postrules`**: Post official branded server rules.
- **`!postpayment` / `/postpayment`**: Post official pricing & payment guide.
- **Built-in Health Check Server**: Compatible with 24/7 cloud hosts (Render, Koyeb, Railway).

## Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/prasenjitmohanta/skillDaddy.git
   cd skillDaddy
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from template:
   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_GUILD_ID=
   DISCORD_ADMIN_ROLE_ID=
   TICKET_CATEGORY_NAME=💌 SKILLDADDY TICKETS
   ```
4. Run the bot:
   ```bash
   npm start
   ```
