import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  try {
    console.log("Testing OpenAI API...");
    console.log("API Key:", process.env.OPENAI_API_KEY ? "Set" : "Not set");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, can you hear me?" }
      ],
      max_tokens: 50
    });

    console.log("API call successful. Response:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error during API call:");
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testOpenAI();