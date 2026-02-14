import 'dotenv/config';
import { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder } from "discord.js";

import { braveSearch } from "./utils/braveSearch.js";
import { askOpenRouter } from "./utils/openRouter.js";
import { generateImage } from "./utils/imageGen.js";

const {
  DISCORD_TOKEN,
  OPENROUTER_API_KEY,
  BRAVE_API_KEY,
  MODELSLAB_API_KEY,
  GUILD_ID
} = process.env;

if (!DISCORD_TOKEN || !OPENROUTER_API_KEY || !BRAVE_API_KEY || !MODELSLAB_API_KEY || !GUILD_ID) {
  console.error("❌ Missing one or more environment variables");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the AI something")
    .addStringOption(opt => opt.setName("question").setDescription("Your question").setRequired(true)),

  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search Brave and summarize")
    .addStringOption(opt => opt.setName("query").setDescription("Search query").setRequired(true)),

  new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Generate an AI image")
    .addStringOption(opt => opt.setName("prompt").setDescription("Describe the image").setRequired(true)),

  new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Get a savage roast")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    const app = await rest.get(Routes.oauth2CurrentApplication());
    await rest.put(
      Routes.applicationGuildCommands(app.id, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Slash registration failed:", err);
  }
}

client.once("ready", async () => {
  console.log(`🔥 Online as ${client.user.tag}`);
  client.user.setActivity("Serving BloodEclipse | /help", { type: ActivityType.Playing });
  await registerCommands();
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  try {
    switch (interaction.commandName) {

      case "ask": {
        const question = interaction.options.getString("question");
        const response = await askOpenRouter(question);
        return interaction.editReply(response);
      }

      case "search": {
        const query = interaction.options.getString("query");
        const resultsText = await braveSearch(query);
        const combinedPrompt = `
User asked: ${query}

Web results:
${resultsText}

Give a concise, savage-personality summary answer:
`;
        const answer = await askOpenRouter(combinedPrompt);
        return interaction.editReply(answer);
      }

      case "imagine": {
        const prompt = interaction.options.getString("prompt");
        const imageURL = await generateImage(prompt);
        return interaction.editReply({ content: prompt, files: [imageURL] });
      }

      case "roast": {
        const roast = await askOpenRouter("Give me a savage roast in gamer style.");
        return interaction.editReply(roast);
      }

      default:
        return interaction.editReply("Command not recognized.");
    }
  } catch (err) {
    console.error("❌ Command error:", err);
    return interaction.editReply("❌ Something went wrong, try again.");
  }
});

client.login(DISCORD_TOKEN);
