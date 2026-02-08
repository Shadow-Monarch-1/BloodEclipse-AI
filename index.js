import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// Helper: DuckDuckGo Search + summary
async function searchAndSummarize(query) {
    try {
        const searchUrl = `https://lite.duckduckgo.com/50x.html?q=${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl);
        const text = await res.text();
        const $ = cheerio.load(text);

        // Grab first few search results
        const results = [];
        $('a.result-link').each((i, el) => {
            if (i < 3) results.push($(el).text() + ' - ' + $(el).attr('href'));
        });

        if (results.length === 0) return "Couldn't find info 😅, try rephrasing!";

        return `Yo fam! 🔎 Found some stuff for "${query}":\n` + results.map(r => `• ${r}`).join('\n');
    } catch (err) {
        console.error(err);
        return "Oops! Something broke while searching 🫠";
    }
}

// Message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    if (content.startsWith('!ai ')) {
        const query = message.content.slice(4).trim();
        if (!query) return message.reply("Gimme something to search 😎");

        const reply = await searchAndSummarize(query);
        message.reply(reply);
    }
});

// Bot ready
client.once('ready', () => {
    console.log(`🔥 BloodEclipse-AI is online as ${client.user.tag}!`);
    client.user.setActivity("BloodEclipse Q&A | !ai <query>", { type: 3 });
});

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("⚠️ Discord bot token missing in .env");
client.login(token);
