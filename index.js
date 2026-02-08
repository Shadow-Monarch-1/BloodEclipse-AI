import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ---------- BOT READY ----------
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('ask')
      .setDescription('Ask BloodEclipse-AI anything')
      .addStringOption(option =>
        option.setName('question')
          .setDescription('Your question')
          .setRequired(true)
      )
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash command registered.');
  } catch (error) {
    console.error(error);
  }
});

// ---------- OPENROUTER CALL ----------
async function askAI(prompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are BloodEclipse-AI, a funny gen-z guild assistant for the game Where Winds Meet. You help with builds, weapons, tips, and web knowledge. Use emojis sometimes."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// ---------- SLASH COMMAND ----------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ask') {
    const question = interaction.options.getString('question');

    await interaction.deferReply();

    try {
      const answer = await askAI(question);
      await interaction.editReply(answer);
    } catch (err) {
      console.error(err);
      await interaction.editReply("⚠️ BloodEclipse-AI crashed. Try again.");
    }
  }
});

// ---------- LOGIN ----------
client.login(process.env.DISCORD_TOKEN);
