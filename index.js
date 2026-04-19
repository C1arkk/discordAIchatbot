const dotenv = require("dotenv");
const axios = require("axios");
const { Client, GatewayIntentBits, Events } = require("discord.js");

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";
const COMMAND_PREFIX = process.env.COMMAND_PREFIX || "/ask";

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

// Using 'ClientReady' instead of 'ready' to fix that warning in your console
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Success! Logged in as ${c.user.tag}`);
  console.log(`Using model: ${GEMINI_MODEL}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots and DM messages
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const askCommand = `${COMMAND_PREFIX}don`;

  // Check if message starts with your commands
  if (!content.toLowerCase().startsWith(askCommand)) {
    return;
  }

  const args = content.split(/\s+/).slice(1);
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return message.reply(`${askCommand} <your question>`);
  }

  await message.channel.sendTyping();

  try {
    const responseText = await queryGeminiWithRetry(prompt);
    await sendLongReply(message, responseText);
  } catch (error) {
    console.error("Final Error Details:", error.response?.data || error.message);
    const detail = error.response?.data?.error?.message || error.message;
    await message.reply(`❌ I hit a snag! \n*(Error: ${detail})*`);
  }
});

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
      const status = error.response?.status;
      
      // 503 is Service Unavailable, 429 is Rate Limited
      if ((status === 503 || status === 429) && i < retries - 1) {
        const waitTime = (i + 1) * 3000; 
        console.warn(`⚠️ Gemini is busy (Status: ${status}). Retrying in ${waitTime/1000}s...`);
        await new Promise(res => setTimeout(res, waitTime));
        continue;
      }
      throw error; 
    }
  }
}

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