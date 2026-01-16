(() => {

  const DAILY_LIMIT = 50;

  function getTodayKey() {
    const now = new Date();
    return now.getFullYear() + "-" +
          String(now.getMonth() + 1).padStart(2, "0") + "-" +
          String(now.getDate()).padStart(2, "0");
  }

  function incrementDailyUsage(callback) {
    chrome.storage.local.get(['dailyUsageCount', 'dailyUsageDate'], (data) => {
      const today = getTodayKey();

      let count = data.dailyUsageCount || 0;
      let date = data.dailyUsageDate;

      if (date !== today) {
        count = 0;
        date = today;
      }

      count += 1;

      chrome.storage.local.set({
        dailyUsageCount: count,
        dailyUsageDate: date
      }, () => {
        callback?.(count);
      });
    });
  }



  const LOADER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width="120"
      height="120">

    <style>
      .ring {
        fill: none;
        stroke: currentColor;
        stroke-width: 20;
        stroke-linecap: square;
        transform-origin: 50% 50%;
      }

      .spin-fast {
        animation: spin 1.8s linear infinite;
      }

      .spin-medium {
        animation: spinReverse 3s linear infinite;
      }

      .spin-slow {
        animation: spin 4.5s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      @keyframes spinReverse {
        from { transform: rotate(360deg); }
        to   { transform: rotate(0deg); }
      }
    </style>

    <circle class="ring spin-fast"
            cx="500" cy="500" r="160"
            stroke-dasharray="500 2013"/>

    <circle class="ring spin-medium"
            cx="500" cy="500" r="240"
            stroke-dasharray="1000 1513"/>

    <circle class="ring spin-slow"
            cx="500" cy="500" r="320"
            stroke-dasharray="1500 1013"/>
  </svg>
  `;

  // ---- Loading overlay ----
  function showLoadingOverlay() {
    if (document.getElementById("instant-explain-loader")) return;

    const overlay = document.createElement("div");
    overlay.id = "instant-explain-loader";

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.45)",
      zIndex: 999998,
      color: "#ffb347",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    });

    const container = document.createElement("div");
    container.style.color = "#ffb347";
    container.style.pointerEvents = "none";

    container.insertAdjacentHTML("beforeend", LOADER_SVG);

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  function hideLoadingOverlay() {
    document.getElementById("instant-explain-loader")?.remove();
  }




  // ---- MODAL ----

  // ---- Detect page language ----
  function detectPageLanguage() {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang.split("-")[0];

    const url = location.href.toLowerCase();
    const match = url.match(/\/(en|ru|es|fr|de|it|pt|uk|pl|nl|cs|sk|ro|hu|el|tr|lv|lt|et|fi|sv|no|da|zh-CN|zh-TW|ja|ko)\//);
    if (match) return match[1];

    return navigator.language.split("-")[0];
  }

  const detectedLang = detectPageLanguage();
  chrome.storage.local.set({ detectedLang });
  // ---- --------------- ----
  

  // ---- Inject centered modal ----
  function injectCenteredModal(contentHTML) {
    if (document.getElementById('ai-explanation-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'ai-explanation-modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.6)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    const modal = document.createElement('div');
    modal.id = 'ai-explanation-modal';
    modal.innerHTML = contentHTML;

    Object.assign(modal.style, {
      background: '#2a2a3d',
      color: '#fff',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      fontFamily: "'Segoe UI', sans-serif",
      textAlign: 'left',
      position: 'relative',
    });

    const closeBtn = document.createElement('span');
    closeBtn.innerText = '✖';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '8px',
      right: '12px',
      cursor: 'pointer',
      fontSize: '18px',
      color: '#ff5555',
    });
    closeBtn.addEventListener('click', () => overlay.remove());
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // Listen for popup messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SHOW_API_MODAL") {
      injectCenteredModal(message.content);
    }
  });





  // ---- Inject hover styles (once) ----
  function injectBubbleStyles() {
    if (document.getElementById("instant-explain-styles")) return;

    const style = document.createElement("style");
    style.id = "instant-explain-styles";
    style.textContent = `
      #instant-explain-bubble:hover {
        border-color: #ff4444 !important;
        box-shadow: 0 10px 28px rgba(0,0,0,0.55);
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }



  // ---- Bubble display function ----

  // ---- Store user preferences in memory ----
  let userFont = "Segoe UI";
  let userFontSize = 14;

  chrome.storage.local.get(['font', 'textSize'], (data) => {
    userFont = data.font || "Segoe UI";
    userFontSize = parseInt(data.textSize || 14, 10);
  });

  // ---- Bubble display function ----
  function showExplanationBubble(text, x = null, y = null, usageCount = null) {
    injectBubbleStyles();

    const existing = document.getElementById("instant-explain-bubble");
    if (existing) existing.remove();

    const bubble = document.createElement("div");
    bubble.id = "instant-explain-bubble";

    // Header
    const header = document.createElement("div");
    header.id = "instant-explain-header";

    const used = usageCount ?? 0;
    header.innerText = `${used} of ${DAILY_LIMIT} free actions used ⵈ Limit resets at 12:00 AM`;


    Object.assign(header.style, {
      fontSize: "11px",
      color: "#ffb347",
      marginBottom: "6px",
      opacity: "0.85",
      userSelect: "none",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      paddingBottom: "4px"
    });

    // Body
    const body = document.createElement("div");
    body.id = "instant-explain-body";
    body.innerText = text;

    bubble.appendChild(header);
    bubble.appendChild(body);

    // Footer with Translate button
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      marginTop: "10px",
      display: "flex",
      justifyContent: "flex-end"
    });

    // Translate button texts map
    const translateButtonTexts = {
      en: "🌍 Translate to English",
      ru: "🌍 Перевести на русский",
      es: "🌍 Traducir al español",
      fr: "🌍 Traduire en français",
      de: "🌍 Übersetze ins Deutsche",
      it: "🌍 Traduci in italiano",
      pt: "🌍 Traduzir para português",
      uk: "🌍 Перекласти українською",
      pl: "🌍 Przetłumacz na polski",
      nl: "🌍 Vertalen naar Nederlands",
      cs: "🌍 Přeložit do češtiny",
      sk: "🌍 Preložiť do slovenčiny",
      ro: "🌍 Tradu în română",
      hu: "🌍 Fordítás magyarra",
      el: "🌍 Μετάφραση στα ελληνικά",
      tr: "🌍 Türkçeye çevir",
      lv: "🌍 Tulko uz latviešu valodu",
      lt: "🌍 Išversti į lietuvių kalbą",
      et: "🌍 Tõlgi eesti keelde",
      fi: "🌍 Käännä suomeksi",
      sv: "🌍 Översätt till svenska",
      no: "🌍 Oversett til norsk",
      da: "🌍 Oversæt til dansk",
      "zh-CN": "🌍 翻译成中文(简体)",
      "zh-TW": "🌍 翻譯成中文(繁體)",
      ja: "🌍 日本語に翻訳",
      ko: "🌍 한국어로 번역",
      hi: "🌍 हिंदी में अनुवाद",
      bn: "🌍 বাংলায় অনুবাদ করুন",
      ur: "🌍 اردو میں ترجمہ کریں",
      th: "🌍 แปลเป็นภาษาไทย",
      vi: "🌍 Dịch sang tiếng Việt",
      id: "🌍 Terjemahkan ke Bahasa Indonesia",
      ar: "🌍 الترجمة إلى العربية",
      he: "🌍 לתרגם לעברית",
      fa: "🌍 ترجمه به فارسی",
      sw: "🌍 Tafsiri kwa Kiswahili",
      af: "🌍 Vertaal na Afrikaans",
      sr: "🌍 Преведи на српски",
      hr: "🌍 Prevedi na hrvatski",
      bs: "🌍 Prevedi na bosanski",
      sl: "🌍 Prevedi v slovenščino",
      bg: "🌍 Преведи на български",
      mk: "🌍 Преведи на македонски",
      sq: "🌍 Përkthe në shqip",
      ka: "🌍 თარგმნე ქართულად",
      hy: "🌍 Թարգմանել հայերեն",
      nd: "🌍 Translate" // fallback / auto-detect
    };

    // --- Function to update Translate button text ---
    function updateTranslateBtnText(button) {
      chrome.storage.local.get(['explanationLanguage'], ({ explanationLanguage }) => {
        const targetLang = explanationLanguage || 'en';
        button.innerText = translateButtonTexts[targetLang] || "🌍 Translate";
      });
    }

    // --- Create Translate button ---
    const translateBtn = document.createElement("button");
    Object.assign(translateBtn.style, {
      background: "#3a3a55",
      color: "#fff",
      border: "1px solid #555",
      borderRadius: "6px",
      padding: "4px 8px",
      fontSize: "12px",
      cursor: "pointer",
      transition: "background 0.15s ease, transform 0.1s ease",
      textDecoration: "none"
    });
    translateBtn.addEventListener("mouseenter", () => translateBtn.style.background = "#505070");
    translateBtn.addEventListener("mouseleave", () => translateBtn.style.background = "#3a3a55");

    // Set initial text
    updateTranslateBtnText(translateBtn);

    // --- Auto-update button text on settings change ---
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.explanationLanguage) {
        updateTranslateBtnText(translateBtn);
      }
    });

    // --- Click handler ---
    translateBtn.addEventListener("click", (e) => {
      e.stopPropagation(); 
      chrome.storage.local.get(['explanationLanguage'], ({ explanationLanguage }) => {
        const targetLang = explanationLanguage || 'en';
        const url = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(body.innerText)}&op=translate`;
        window.open(url, '_blank');
      });
    });

  
    footer.appendChild(translateBtn);
    bubble.appendChild(footer);



    

    // ---- Apply user font and size  ----
    Object.assign(bubble.style, {
      position: "absolute",
      background: "#2a2a3d",
      color: "#e0e0e0",
      border: "2px solid #444",
      borderRadius: "10px",
      padding: "12px 16px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
      zIndex: 999999,
      maxWidth: "320px",
      fontFamily: userFont,
      fontSize: userFontSize + "px",
      lineHeight: "1.5",
      whiteSpace: "pre-wrap",
      cursor: "pointer",
      transition: "opacity 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
      opacity: 0,
      transform: "translateY(5px)"
    });

    // Positioning
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

    // Fade in
    document.body.appendChild(bubble);
    requestAnimationFrame(() => {
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(0)";
    });

    // Remove on click or timeout
    bubble.addEventListener("click", () => bubble.remove());
    setTimeout(() => {
      bubble.style.opacity = "0";
      bubble.style.transform = "translateY(5px)";
      setTimeout(() => bubble.remove(), 200);
    }, 500000);
  }




  // ---- Top frame guard ----
  if (window !== window.top) return;
  if (window.__instantExplainInitialized) return;
  window.__instantExplainInitialized = true;

  // ---- Context helper ----
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
    return text.substring(start, end).replace(/\s+/g, " ").trim();
  }

  // ---- Save to dictionary helper ----
  function saveToDictionary(entry) {
    chrome.storage.local.get(['dictionaryEntries'], (data) => {
      const list = data.dictionaryEntries || [];

      list.push(entry);          

      if (list.length > 5000)  
        list.shift();

      chrome.storage.local.set({ dictionaryEntries: list });
    });
  }

  // ---- Listen for menu clicks ----
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "EXPLAIN_SELECTION") return;

    const selection = window.getSelection();
    const context = getContextAroundSelection(selection);
    const detectedLanguage = detectPageLanguage();

    showLoadingOverlay(); // show loading animation


    chrome.runtime.sendMessage(
      {
        type: "EXPLAIN_SELECTION_API",
        text: message.text,
        context,
        detectedLanguage
      },
      (res) => {
        hideLoadingOverlay();

        incrementDailyUsage((count) => {
          if (res?.error) {
            showExplanationBubble(res.error, null, null, count);
          } else {
            showExplanationBubble(res.explanation, null, null, count);
            chrome.storage.local.get(['dictionaryMode'], ({ dictionaryMode }) => {
              if (!dictionaryMode) return;

              saveToDictionary({
                id: crypto.randomUUID(),
                term: message.text,
                explanation: res.explanation,
                language: detectedLanguage,
                pageUrl: location.href,
                timestamp: Date.now()
              });
            });
          }
        });
      }
    );

  });

})();



