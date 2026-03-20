const Anthropic = require("@anthropic-ai/sdk");
const { getMasterPrompt } = require("./prompts");

const client = new Anthropic();

async function generateLetter({
  guardianName,
  guardianDescription,
  customerName,
  formResponses,
}) {
  const masterPrompt = getMasterPrompt({
    guardianName,
    guardianDescription,
    customerName,
    formResponses,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: masterPrompt,
      },
    ],
  });

  return message.content[0].text;
}

module.exports = { generateLetter };
