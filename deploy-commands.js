/**
 * Optional Manual Slash Commands Deploy Script
 * Run with: node deploy-commands.js
 */

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in your .env file!');
  process.exit(1);
}

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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    if (GUILD_ID) {
      console.log(`Registering commands to Guild: ${GUILD_ID}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ Successfully registered guild slash commands (instant update)!');
    } else {
      console.log('Registering global commands...');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Successfully registered global slash commands!');
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
