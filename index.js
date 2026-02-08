// index.js (ready-to-paste)
// BloodEclipse-AI — Gen-Z, web-search + AI summarization for Where Winds Meet guild

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini'; // change if you prefer another model

if (!DISCORD_TOKEN) {
  console.error('⚠️ DISCORD_TOKEN is missing. Add it to Railway variables (or .env locally).');
  process.exit(1);
}
if (!OPENROUTER_API_KEY) {
  console.error('⚠️ OPENROUTER_API_KEY (or OPENAI_API_KEY) is missing. Add it to Railway variables.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// --- System persona prompt (tweak this as needed) ---
const SYSTEM_PROMPT = `
You are BloodEclipse-AI, the official Discord bot for the BloodEclipse guild in the MMORPG "Where Winds Meet".
Personality:
- Gen-Z gamer vibe: slang like "fam", "pog", "no cap", emojis, brainrot style.
- Helpful, concise, gives clear builds/steps and citations when factual info is used.
- If unsure, admit it with a funny tone and suggest asking a veteran.
Limit replies to ~200 words unless user asks for deep dive.
`;

// --- Utility: perform a DuckDuckGo (lite) web search and collect top snippets ---
async function performWebSearch(query) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
    };
    // Adding "Where Winds Meet" helps bias results to the game if query is ambiguous
    const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query + ' Where Winds Meet')}`;
    const res = await fetch(searchUrl, { headers, timeout: 15_000 });
    if (!res.ok) throw new Error(`Search failed with status ${res.status}`);
    const text = await res.text();
    const $ = cheerio.load(text);

    let context = '';
    const links = [];

    $('tr').each((i, el) => {
      if (i >= 10) return; // limit scraping to the top rows
      const linkAnchor = $(el).find('a.result-link');
      const snippet = $(el).find('.result-snippet').text().trim();
      if (linkAnchor.length > 0) {
        const title = linkAnchor.text().trim();
        const href = linkAnchor.attr('href');
        if (title && snippet) {
          context += `Title: ${title}\nSnippet: ${snippet}\n\n`;
          if (href) links.push(href);
        }
      }
    });

    if (!context) {
      return { context: 'No relevant search results found.', links: [] };
    }
    return { context: context.trim(), links: links.slice(0, 5) };
  } catch (err) {
    console.error('Search error:', err);
    return { context: 'Search tool currently failed or is blocked.', links: [] };
  }
}

// --- Utility: call OpenRouter (chat-style) to summarize / answer ---
async function callOpenRouterChat(systemPrompt, userContent) {
  try {
    const payload = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 600,
      temperature: 0.8,
      top_p: 0.9
    };

    const res = await fetch('https://api.openrouter.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify(payload),
      timeout: 60_000
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`OpenRouter API error ${res.status}: ${txt}`);
    }

    const data = await res.json();

    // Safe extraction of content
    const choice = data?.choices?.[0];
    const content = choice?.message?.content ?? choice?.text ?? data?.output ?? null;

    return content ? String(content).trim() : null;
  } catch (err) {
    console.error('OpenRouter error:', err);
    return null;
  }
}

// --- Main message handler ---
client.on('messageCreate', async (message) => {
  try {
    if (message.author?.bot) return;

    // Prefix-based trigger: !ai <query>
    const raw = message.content || '';
    if (!raw.toLowerCase().startsWith('!ai')) return;

    const query = raw.slice(3).trim();
    if (!query) {
      await message.reply("Yo fam — type a question after `!ai`, e.g. `!ai best sword build` ✨");
      return;
    }

    // UX: typing indicator
    await message.channel.sendTyping();

    // Step 1: Ask the LLM whether a web search is needed.
    const decisionPrompt = `
You are BloodEclipse-AI (Gen-Z, gamer slangs). The user asked: "${query}"
Decide if this needs a web search for factual, up-to-date info (yes/no).
If YES -> Return exactly the short search query to use (1 line only).
If NO -> Return the answer to the user directly in your personality (with emojis).
`;
    const decision = await callOpenRouterChat(SYSTEM_PROMPT, decisionPrompt);

    let finalAnswer = null;
    let usedSources = [];

    // Heuristic: if decision is short and looks like a query (no emojis, punctuation), treat it as search query
    const looksLikeSearch = decision && decision.length < 120 && !/[^\w\s:,-]/.test(decision) && /\w/.test(decision);

    if (looksLikeSearch) {
      // Perform web search
      const { context, links } = await performWebSearch(decision);
      usedSources = links;

      // Build prompt for summarization
      const summaryPrompt = `
User query: "${query}"
Web search snippets:
${context}

Using the snippets, produce a concise, Gen-Z, emoji-rich answer to the user's question.
Cite the sources by adding a "Sources:" section at the end with the link(s) if available.
Keep it friendly and no longer than ~200 words unless the user asks for more.
`;
      const ai = await callOpenRouterChat(SYSTEM_PROMPT, summaryPrompt);
      finalAnswer = ai || "Low-key couldn't summarize the results, try rephrasing or ask for a manual guide. 😅";
    } else {
      // AI answered directly
      finalAnswer = decision || "My brain went AFK. Can you rephrase? 🤯";
    }

    // Build an embed if possible
    const embed = new EmbedBuilder()
      .setTitle('BloodEclipse-AI ⚔️')
      .setDescription(finalAnswer)
      .setColor('#EE6A50')
      .setTimestamp()
      .setFooter({ text: 'BloodEclipse • Where Winds Meet — Ask me anything with !ai' });

    if (usedSources.length > 0) {
      embed.addFields({ name: 'Sources', value: usedSources.slice(0, 5).map(l => `<${l}>`).join('\n') });
    }

    // Send reply (embeds look nicer). If too long or embed fails, fallback to plain text.
    try {
      await message.reply({ embeds: [embed] });
    } catch (err) {
      // fallback plain text
      console.warn('Embed failed, sending plain text:', err);
      await message.reply(finalAnswer);
    }

    // Small interactive touch: react with a random emoji
    try {
      const emojis = ['🔥','✨','💯','🎮','😎','🤯'];
      await message.react(emojis[Math.floor(Math.random() * emojis.length)]);
    } catch (_) { /* ignore reaction errors */ }

  } catch (err) {
    console.error('Unhandled handler error:', err);
    try {
      await message.reply("Oof, my circuits glitched — try again in a sec. 🫠");
    } catch (_) {}
  }
});

// Ready
client.once('ready', () => {
  console.log(`🔥 BloodEclipse-AI is online as ${client.user.tag}!`);
  try {
    client.user.setActivity('WWM Guides | !ai', { type: ActivityType.Watching });
  } catch (e) { /* ignore setActivity errors */ }
});

// Login
client.login(DISCORD_TOKEN).catch(err => {
  console.error('Failed to login to Discord (check DISCORD_TOKEN):', err);
  process.exit(1);
});
