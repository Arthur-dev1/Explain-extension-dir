// ---- Context menu setup ----
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.remove("explain-selection", () => {
    chrome.contextMenus.create({
      id: "explain-selection",
      title: "Explain selection",
      contexts: ["selection"]
    });
  });
});

// ---- Menu click handler ----
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "explain-selection") return;
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "EXPLAIN_SELECTION",
    text: info.selectionText
  });
});

// ---- Handle API requests from content script ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "EXPLAIN_SELECTION_API") return true;

  const OPENROUTER_KEY = ""; 
  const MODEL = "allenai/molmo-2-8b:free";

  if (!OPENROUTER_KEY) {
    sendResponse({ error: "No API key found!" });
    return;
  }

  (async () => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "You explain words and phrases in simple terms." },
            { role: "user", content: `Explain "${message.text}" in context. Use this surrounding text to help: "${message.context}"` }
          ],
          max_tokens: 200
        })
      });

      const result = await response.json();
      const explanation = result.choices?.[0]?.message?.content || "No explanation returned";
      sendResponse({ explanation });

    } catch (err) {
      console.error("OpenRouter fetch error:", err);
      sendResponse({ error: "API fetch error" });
    }
  })();

  return true; 
});
