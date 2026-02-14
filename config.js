import 'dotenv/config';

export const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_CSE_ID: process.env.GOOGLE_CSE_ID,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  MODELSLAB_API_KEY: process.env.MODELSLAB_API_KEY,
  GUILD_ID: process.env.GUILD_ID
};

if (!CONFIG.DISCORD_TOKEN || !CONFIG.GOOGLE_API_KEY || !CONFIG.GOOGLE_CSE_ID ||
    !CONFIG.OPENROUTER_API_KEY || !CONFIG.MODELSLAB_API_KEY || !CONFIG.GUILD_ID) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}
