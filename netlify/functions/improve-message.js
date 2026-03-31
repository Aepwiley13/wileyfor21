exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { whySupporting, issues, aboutMe, volunteerName } = JSON.parse(event.body || "{}");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "API not configured" }),
      };
    }

    const prompt = `You are helping a grassroots campaign volunteer write a personal outreach message to a convention delegate for Aaron Wiley, who is running for Utah House District 21. Aaron is a Rose Park dad, youth coach, and community organizer with 20 years on the West Side. He was the first paid employee on Barack Obama's campaign in Utah.

The volunteer has answered a few questions. Turn their raw answers into a short, warm, genuine text message — human and personal, not scripted or salesy. It should sound like a real neighbor reaching out.

Volunteer's name: ${volunteerName || "a neighbor"}
Why they support Aaron: ${whySupporting}
Issues that matter to them: ${issues || "(not provided)"}
About themselves: ${aboutMe || "(not provided)"}

Write a 2–4 sentence message. Use [DELEGATE_NAME] as a placeholder for the delegate's name. Start with "Hi [DELEGATE_NAME]". End with: "The convention is April 11 — I hope you'll join me in supporting Aaron. wileyfor21.com"

Return only the message text, nothing else.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: data.error?.message || "API error" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: data.content[0].text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
