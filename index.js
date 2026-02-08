console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "FOUND" : "MISSING");
console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "FOUND" : "MISSING");
// BloodEclipse-AI — Stable Version (NO CHEERIO, NO SCRAPING)

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import fetch from 'node-fetch';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "gpt-4o-mini"; // fast & cheap

if (!DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN");
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

// --------------------
// Discord Client
// --------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// --------------------
// Persona Prompt
// --------------------

const SYSTEM_PROMPT = `
You are BloodEclipse-AI, the official Discord bot for the BloodEclipse guild in the MMORPG "Where Winds Meet".

Style:
- Gen-Z gamer slang
- Emojis
- Friendly, concise
- If unsure, admit it casually
- Keep answers under 200 words
`;

// --------------------
// DuckDuckGo Instant Answer API
// --------------------

async function webSearch(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.AbstractText) return data.AbstractText;
    if (data.Answer) return data.Answer;

    return "No direct info found.";
  } catch (err) {
    console.error("Search error:", err);
    return "Search unavailable.";
  }
}

// --------------------
// OpenRouter AI Call
// --------------------

async function askAI(prompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "AI brain fart 🤯";
}

// --------------------
// Message Handler
// --------------------

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!ai ")) return;

  const query = message.content.slice(4).trim();
  if (!query) return message.reply("Ask something fam 👀");

  await message.channel.sendTyping();

  try {
    const searchInfo = await webSearch(query);

    const aiReply = await askAI(`
User question: ${query}

Web info:
${searchInfo}

Answer naturally:
`);

    message.reply(aiReply.slice(0, 2000));
  } catch (err) {
    console.error(err);
    message.reply("System crashed 💀 Try again.");
  }
});

// --------------------
// Ready Event
// --------------------

client.once("ready", () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
  client.user.setActivity("WWM Guides | !ai", {
    type: ActivityType.Watching
  });
});

// --------------------
// Login
// --------------------

client.login(DISCORD_TOKEN);
