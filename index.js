const dotenv = require("dotenv");
const axios = require("axios");
const { Client, GatewayIntentBits } = require("discord.js");

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
const COMMAND_PREFIX = process.env.COMMAND_PREFIX;

// Initial Setup Validation
if (!DISCORD_TOKEN || !GEMINI_API_KEY) {
  throw new Error("Missing credentials! Check your .env file.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Success! Logged in as ${client.user.tag}`);
  console.log(`Using model: ${GEMINI_MODEL}`);
});

client.on("messageCreate", async (message) => {
  // Ignore bots and DM messages
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const askCommand = `${COMMAND_PREFIX}ask`;
  const geminiCommand = `${COMMAND_PREFIX}gemini`;

  // Check if message starts with your commands
  if (!content.toLowerCase().startsWith(askCommand) && !content.toLowerCase().startsWith(geminiCommand)) {
    return;
  }

  const args = content.split(/\s+/).slice(1);
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return message.reply(`${askCommand} <your question>`);
  }

  // Show the "Bot is thinking..." status in Discord
  await message.channel.sendTyping();

  try {
    const responseText = await queryGeminiWithRetry(prompt);
    await sendLongReply(message, responseText);
  } catch (error) {
    console.error("Final Error:", error.message);
    const detail = error.response?.data?.error?.message || error.message;
    await message.reply(`❌ I'm having trouble connecting to my brain right now. Please try again in a minute. \n*(Error: ${detail})*`);
  }
});

/**
 * Calls Gemini API with automatic retries for 503 (High Demand) errors.
 */
async function queryGeminiWithRetry(prompt, retries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, body);
      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I processed that, but had nothing to say.";
    } catch (error) {
      const isServiceUnavailable = error.response?.status === 503;
      
      if (isServiceUnavailable && i < retries - 1) {
        const waitTime = (i + 1) * 3000; // Wait 3s, then 6s
        console.warn(`⚠️ Gemini is busy. Retrying in ${waitTime/1000}s... (Attempt ${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, waitTime));
        continue;
      }
      throw error; // Rethrow if it's a permanent error (400, 401, 403) or out of retries
    }
  }
}

/**
 * Handles Discord's 2000 character limit by splitting long text.
 */
async function sendLongReply(message, text) {
  const maxLength = 2000;
  if (text.length <= maxLength) {
    return message.reply(text);
  }

  const chunks = text.match(/[\s\S]{1,2000}/g) || [];
  for (const chunk of chunks) {
    await message.channel.send(chunk);
  }
}

client.login(DISCORD_TOKEN);