import axios from "axios";

export async function askOpenRouter(prompt) {
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `
You are BloodEclipse‑AI: savage gamer personality:
• Friendly but roasty
• Use emojis
• Concise answers
` },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      }
    );

    return res.data.choices[0].message.content;
  } catch (err) {
    console.error("OpenRouter error:", err);
    return "AI failed to respond.";
  }
}
