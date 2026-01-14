// ================================
// Context menu setup
// ================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "explain-selection",
      title: "Explain selection ✨",
      contexts: ["selection"]
    });
  });
});

// ================================
// Menu click → content script
// ================================
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "explain-selection") return;
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "EXPLAIN_SELECTION",
    text: info.selectionText
  });
});

// ================================
// Helper: load settings with defaults
// ================================
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "apiKey",
        "explanationDepth",
        "explanationLanguage",
        "dualLanguage",
        "dictionaryMode",
        "font",
        "textSize"
      ],
      (data) => {
        resolve({
          apiKey: data.apiKey || "",
          explanationDepth: data.explanationDepth || "normal",
          explanationLanguage: data.explanationLanguage || "en",
          dualLanguage: data.dualLanguage || "none",
          dictionaryMode: data.dictionaryMode || false,
          font: data.font || "Arial",
          textSize: data.textSize || "14"
        });
      }
    );
  });
}


// ================================
// PROMPT builder
// ================================

function buildSystemPrompt(settings, detectedLanguage) {
  let prompt = "You explain words and phrases clearly and accurately.";

  // Depth style
  if (settings.explanationDepth === "short") {
    prompt += " Keep explanations very short and simple.";
  } else if (settings.explanationDepth === "academic") {
    prompt += " Use an academic tone with precise terminology.";
  } else {
    prompt += " Use a friendly, clear, professional tone.";
  }

  // Dictionary mode (currently not used)
 

  // Bilingual
  if (settings.dualLanguage === "en|ru") {
    prompt += " Respond in two languages: English first, Russian second.";
  } else {
    // Single language
    let lang = settings.explanationLanguage;
    if (lang !== "en" && lang !== "ru") lang = "en"; // fallback to English
    prompt += ` Respond in ${lang}.`;
  }

  return prompt;
}

// ================================
// API handler
// ================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "EXPLAIN_SELECTION_API") return true;

  (async () => {
    const settings = await getSettings();
    const detectedLanguage = message.detectedLanguage || "en";

    if (!settings.apiKey) {
      sendResponse({ error: "No API key found. Add one in settings 😉" });
      return;
    }

    const MODEL = "allenai/molmo-2-8b:free";
    const systemPrompt = buildSystemPrompt(settings, detectedLanguage);

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Explain "${message.text}" in context. Use this surrounding text to help: "${message.context}"`
              }
            ],
            max_tokens: 300
          })
        }
      );

      const result = await response.json();
      const explanation =
        result.choices?.[0]?.message?.content ||
        "Hmm… I couldn’t come up with a good explanation 🤔";

      sendResponse({ explanation });
    } catch (err) {
      console.error("OpenRouter error:", err);
      sendResponse({ error: "API request failed 😬" });
    }
  })();

  return true;
});

