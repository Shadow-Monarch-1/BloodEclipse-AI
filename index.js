import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import OpenAI from 'openai';

// 1. Setup Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// 2. Setup OpenRouter (via OpenAI SDK)
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY, // Make sure this is in your .env
    defaultHeaders: {
        "HTTP-Referer": "https://github.com/BloodEclipse", // Optional credits
        "X-Title": "BloodEclipse-AI",
    }
});

// 3. The "Gen-Z" System Prompt
const SYSTEM_PROMPT = `
You are BloodEclipse-AI, the official Discord bot for the BloodEclipse guild in the MMORPG 'Where Winds Meet'.
YOUR PERSONA:
- You are Gen-Z, hyped, and use gamer slang (fam, no cap, bet, pog, gg, builds, meta).
- You utilize emojis frequently but naturally (🔥, ⚔️, 💀, 👀, ✨).
- You are helpful but casual.
- If the context provided helps, summarize it.
- If the context doesn't help or you don't know, admit it jokingly and suggest they ask a veteran.
- Keep answers concise (under 200 words) unless asked for a deep dive.
`;

// 4. Robust Search Function (Scraping)
async function performWebSearch(query) {
    try {
        // Use a User-Agent to prevent basic blocking
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query + " Where Winds Meet game")}`;
        
        const res = await fetch(searchUrl, { headers });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const text = await res.text();
        const $ = cheerio.load(text);

        let searchContext = "";
        const links = [];

        // Scrape Table rows in DDG Lite
        $('tr').each((i, el) => {
            if (i > 10) return; // Limit to top results
            const linkAnchor = $(el).find('a.result-link');
            const snippet = $(el).find('.result-snippet').text().trim();
            
            if (linkAnchor.length > 0) {
                const title = linkAnchor.text().trim();
                const href = linkAnchor.attr('href');
                if (title && href && snippet) {
                    searchContext += `Title: ${title}\nSnippet: ${snippet}\n\n`;
                    links.push(href);
                }
            }
        });

        return { context: searchContext || "No relevant search results found.", links: links.slice(0, 3) };
    } catch (err) {
        console.error("Search Error:", err);
        return { context: "Search tool is currently offline.", links: [] };
    }
}

// 5. Message Handler
client.on('messageCreate', async (message) => {
    // Ignore bots and messages without prefix
    if (message.author.bot || !message.content.toLowerCase().startsWith('!ai ')) return;

    const query = message.content.slice(4).trim();
    if (!query) return message.reply("Yo fam, you gotta type something! 💀 Example: `!ai best sword build`");

    // UX: Show typing indicator
    await message.channel.sendTyping();

    try {
        // Step A: Search the web
        const searchData = await performWebSearch(query);

        // Step B: Ask AI to synthesize answer
        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-lite-preview-02-05:free", // Cheap/Free & Fast model on OpenRouter
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `User Query: ${query}\n\nWeb Search Results:\n${searchData.context}` }
            ]
        });

        let aiResponse = completion.choices[0].message.content;

        // Step C: Append Sources (if any)
        if (searchData.links.length > 0) {
            aiResponse += `\n\n**Sources:**\n` + searchData.links.map(l => `<${l}>`).join('\n');
        }

        // Step D: Send (Split if too long)
        if (aiResponse.length > 2000) {
            message.reply(aiResponse.slice(0, 1995) + "...");
        } else {
            message.reply(aiResponse);
        }

    } catch (error) {
        console.error("AI/Bot Error:", error);
        message.reply("Oof, my brain glitched 🫠. Try again in a sec!");
    }
});

client.once('ready', () => {
    console.log(`🔥 BloodEclipse-AI is online as ${client.user.tag}!`);
    client.user.setActivity("WWM Guides | !ai", { type: ActivityType.Watching });
});

// Login
client.login(process.env.DISCORD_TOKEN);
