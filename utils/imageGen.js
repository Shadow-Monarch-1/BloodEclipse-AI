import axios from "axios";

export async function generateImage(prompt) {
  try {
    const res = await axios.post(
      "https://modelslab.com/api/v6/images/text2img",
      {
        key: process.env.MODELSLAB_API_KEY,
        prompt,
        width: 512,
        height: 512,
        samples: 1
      }
    );

    return res.data.output[0];
  } catch (err) {
    console.error("ImageGen error:", err);
    throw err;
  }
}
