(() => {
  // ---- Bubble display function ----
  function showExplanationBubble(text, x = null, y = null) {
    const existing = document.getElementById("instant-explain-bubble");
    if (existing) existing.remove();

    const bubble = document.createElement("div");
    bubble.id = "instant-explain-bubble";
    bubble.innerText = text;

    // ---  styling ---
    Object.assign(bubble.style, {
      position: "absolute",
      background: "#2a2a3d",         
      color: "#e0e0e0",               
      border: "1px solid #444",        
      borderRadius: "10px",
      padding: "12px 16px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.4)", 
      zIndex: 999999,
      maxWidth: "320px",
      fontSize: "14px",
      lineHeight: "1.5",
      whiteSpace: "pre-wrap",
      cursor: "pointer",
      fontFamily: "'Segoe UI', sans-serif",
      transition: "opacity 0.2s ease, transform 0.2s ease",
      opacity: 0,
      transform: "translateY(5px)"
    });

    // --- Positioning ---
    if (!x || !y) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        x = rect.left + window.scrollX;
        y = rect.bottom + window.scrollY + 8;
      } else {
        x = 100;
        y = 100;
      }
    }

    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;

    // --- Fade in animation ---
    document.body.appendChild(bubble);
    requestAnimationFrame(() => {
      bubble.style.opacity = 1;
      bubble.style.transform = "translateY(0)";
    });

    // --- Remove on click or after 40s ---
    bubble.addEventListener("click", () => bubble.remove());
    setTimeout(() => {
      bubble.style.opacity = 0;
      bubble.style.transform = "translateY(5px)";
      setTimeout(() => bubble.remove(), 200);
    }, 40000);
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

