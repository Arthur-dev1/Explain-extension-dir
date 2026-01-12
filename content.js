(() => {
  // ---- Bubble display function ----
  function showExplanationBubble(text, x = null, y = null) {
    const existing = document.getElementById("instant-explain-bubble");
    if (existing) existing.remove();

    const bubble = document.createElement("div");
    bubble.id = "instant-explain-bubble";
    bubble.innerText = text;
    bubble.style.position = "absolute";
    bubble.style.background = "#fff";
    bubble.style.color = "#000";
    bubble.style.border = "1px solid #888";
    bubble.style.borderRadius = "8px";
    bubble.style.padding = "10px";
    bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    bubble.style.zIndex = 999999;
    bubble.style.maxWidth = "300px";
    bubble.style.fontSize = "14px";
    bubble.style.lineHeight = "1.4";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.style.cursor = "pointer";

    if (!x || !y) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        x = rect.left + window.scrollX;
        y = rect.bottom + window.scrollY + 5;
      } else {
        x = 100;
        y = 100;
      }
    }

    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;

    bubble.addEventListener("click", () => bubble.remove());
    setTimeout(() => bubble.remove(), 40000);

    document.body.appendChild(bubble);
  }

  // ---- Top frame guard ----
  if (window !== window.top) return;
  if (window.__instantExplainInitialized) return;
  window.__instantExplainInitialized = true;

  let lastHandledText = null;

  function getContextAroundSelection(selection, charRadius = 250) {
    if (!selection || selection.isCollapsed) return "";
    const range = selection.getRangeAt(0);
    const container = range.startContainer.parentNode;
    let text = container.innerText || container.textContent || "";
    const selectedText = selection.toString().trim();
    const idx = text.indexOf(selectedText);
    if (idx === -1) return selectedText;

    const start = Math.max(0, idx - charRadius);
    const end = Math.min(text.length, idx + selectedText.length + charRadius);
    let context = text.substring(start, end).replace(/\s+/g, " ").trim();
    return context;
  }

  // ---- Listen for menu clicks ----
    chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "EXPLAIN_SELECTION") return;

    const selection = window.getSelection();
    const context = getContextAroundSelection(selection);

    chrome.runtime.sendMessage(
        { type: "EXPLAIN_SELECTION_API", text: message.text, context },
        (res) => {
        if (res.error) showExplanationBubble(res.error);
        else showExplanationBubble(res.explanation);
        }
    );
    });
})();
