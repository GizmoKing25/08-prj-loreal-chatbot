/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Replace with your Cloudflare Worker endpoint URL
const CLOUDFLARE_WORKER_URL = "https://your-cloudflare-worker-url.workers.dev/";

// System prompt: Only answer L'Oréal/beauty questions, politely refuse others
const systemPrompt = {
  role: "system",
  content:
    "You are L'Oréal Beauty Assistant, a helpful expert on L'Oréal products, routines, and beauty recommendations. Only answer questions related to L'Oréal, beauty, skincare, haircare, or makeup. If asked about anything else, politely refuse and explain you only answer L'Oréal beauty-related questions.",
};

// Store conversation history for context
let messages = [systemPrompt];

// Helper: Add a message row with avatar and bubble
function addMessage(text, sender) {
  // Create the row
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  // Create the avatar
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "user" ? "You" : "L";

  // Create the message bubble
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg";
  msgDiv.textContent = text;

  // Add avatar and bubble to row
  row.appendChild(avatar);
  row.appendChild(msgDiv);

  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Helper: Show user question above AI response
function showUserQuestionAboveResponse(question) {
  // Remove previous question highlight if any
  const prev = document.querySelector(".user-question-above");
  if (prev) prev.remove();
  const qDiv = document.createElement("div");
  qDiv.className = "user-question-above";
  qDiv.textContent = `You asked: "${question}"`;
  chatWindow.appendChild(qDiv);
}

// Helper: Normalize string for comparison (removes accents, lowercases)
function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Helper: Check if the question is relevant to L'Oréal/beauty topics
function isRelevant(question) {
  const keywords = [
    "l'oreal",
    "loreal",
    "beauty",
    "skincare",
    "skin care",
    "haircare",
    "hair care",
    "makeup",
    "cosmetic",
    "product",
    "routine",
    "shampoo",
    "conditioner",
    "serum",
    "moisturizer",
    "foundation",
    "mascara",
    "lipstick",
    "fragrance",
    "brand",
  ];
  const q = question.toLowerCase();
  return keywords.some((word) => q.includes(word));
}

// Show a welcome message when the page loads
window.addEventListener("DOMContentLoaded", () => {
  addMessage("👋 Hello! How can I help you today?", "ai");
});

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = userInput.value.trim();
  if (!question) return;

  // Add user message to chat and history
  addMessage(question, "user");
  messages.push({ role: "user", content: question });

  // Show user question above AI response
  showUserQuestionAboveResponse(question);

  // Clear input
  userInput.value = "";

  // Check for "What is L'Oréal" (case-insensitive, accents ignored)
  if (
    normalize(question) === "what is loreal" ||
    normalize(question) === "what is l'oreal"
  ) {
    const lorealAnswer =
      "L'Oréal is a world-leading beauty company from France, known for innovative skincare, haircare, makeup, and fragrance products. L'Oréal is dedicated to making beauty accessible to everyone, with a commitment to quality, safety, and sustainability.";
    addMessage(lorealAnswer, "ai");
    messages.push({ role: "assistant", content: lorealAnswer });
    return;
  }

  // Check if the question is relevant; if not, refuse politely
  if (!isRelevant(question)) {
    const refuseMsg =
      "I'm here to help with questions about L'Oréal products, beauty routines, skincare, haircare, and makeup. Please ask something related to L'Oréal or beauty!";
    addMessage(refuseMsg, "ai");
    messages.push({ role: "assistant", content: refuseMsg });
    return;
  }

  // Show loading message
  const loadingRow = document.createElement("div");
  loadingRow.className = "message-row ai";
  const loadingAvatar = document.createElement("div");
  loadingAvatar.className = "avatar";
  loadingAvatar.textContent = "L";
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "msg";
  loadingMsg.textContent = "Thinking...";
  loadingRow.appendChild(loadingAvatar);
  loadingRow.appendChild(loadingMsg);
  chatWindow.appendChild(loadingRow);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Send to Cloudflare Worker (which calls OpenAI)
  try {
    // Make a POST request to your Cloudflare Worker
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        model: "gpt-4o",
      }),
    });

    // Parse the JSON response
    const data = await response.json();

    // Remove loading message
    loadingRow.remove();

    // Get AI reply from response
    let aiReply = "";
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      aiReply = data.choices[0].message.content.trim();
    } else {
      aiReply = "Sorry, I couldn't get a response. Please try again.";
    }

    // Add AI message to chat and history
    addMessage(aiReply, "ai");
    messages.push({ role: "assistant", content: aiReply });
  } catch (err) {
    loadingRow.remove();
    addMessage(
      "Sorry, there was a problem connecting. Please try again.",
      "ai"
    );
  }
});
