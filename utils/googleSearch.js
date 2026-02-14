import axios from "axios";

export async function googleSearchAndFormat(query) {
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CSE_ID,
        q: query
      }
    });

    const items = res.data.items || [];
    if (!items.length) return "No search results.";

    return items.slice(0, 5).map(item =>
      `${item.title}: ${item.snippet} \n<${item.link}>`
    ).join("\n\n");

  } catch (err) {
    console.error("Google Search API error:", err);
    return "Search failed or no results found.";
  }
}
