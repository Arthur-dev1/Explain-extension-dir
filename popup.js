// DOM elements
const apiKeyInput = document.getElementById('apiKeyInput');
const explanationDepth = document.getElementById('explanationDepth');
const explanationLanguage = document.getElementById('explanationLanguage');
const fontSelect = document.getElementById('fontSelect');
const textSizeSelect = document.getElementById('textSizeSelect');
const dualLanguage = document.getElementById('dualLanguage');
const dictionaryMode = document.getElementById('dictionaryMode');
const saveBtn = document.getElementById('saveBtn');
const downloadBtn = document.getElementById('downloadDictionaryBtn');
const usagePolicy = document.getElementById('usagePolicy');
const getapibtn = document.getElementById('getapibtn');
const explanationModal = document.querySelector('.explanationmodal');

// --- Load settings from chrome.storage.local ---
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get([
    'apiKey', 'explanationDepth', 'explanationLanguage',
    'font', 'textSize', 'dualLanguage', 'dictionaryMode', 'detectedLang'
  ], (data) => {
    apiKeyInput.value = data.apiKey || '';
    explanationDepth.value = data.explanationDepth || 'normal';
    // Use stored language first, fallback to detected page language
    explanationLanguage.value = data.explanationLanguage || data.detectedLang || 'en';
    fontSelect.value = data.font || 'Arial';
    textSizeSelect.value = data.textSize || '14';
    dualLanguage.value = data.dualLanguage || 'none';
    dictionaryMode.checked = data.dictionaryMode || false;
  });

  // --- Keep listener for manual override ---
  explanationLanguage.addEventListener('change', () => {
    const selectedLang = explanationLanguage.value;
    chrome.storage.local.set({ explanationLanguage: selectedLang });
  });
});



// --- Save settings to chrome.storage.local ---
saveBtn.addEventListener('click', () => {
  chrome.storage.local.set({
    apiKey: apiKeyInput.value,
    explanationDepth: explanationDepth.value,
    explanationLanguage: explanationLanguage.value,
    font: fontSelect.value,
    textSize: textSizeSelect.value,
    dualLanguage: dualLanguage.value,
    dictionaryMode: dictionaryMode.checked
  });
});

// --- Download dictionary stub ---
downloadBtn.addEventListener('click', () => {

});

// --- Usage policy link ---
usagePolicy.addEventListener('click', () => {
  chrome.tabs.create({ url: '#' });
});


// --- Get API Key button ---
document.getElementById('getapibtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "SHOW_API_MODAL",
      content: `
        <svg fill="#ffffff" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64px" height="64px" viewBox="-62.55 -62.55 542.08 542.08" xml:space="preserve" transform="rotate(180)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.833958"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M356.004,61.156c-81.37-81.47-213.377-81.551-294.848-0.182c-81.47,81.371-81.552,213.379-0.181,294.85 c81.369,81.47,213.378,81.551,294.849,0.181C437.293,274.636,437.375,142.626,356.004,61.156z M237.6,340.786 c0,3.217-2.607,5.822-5.822,5.822h-46.576c-3.215,0-5.822-2.605-5.822-5.822V167.885c0-3.217,2.607-5.822,5.822-5.822h46.576 c3.215,0,5.822,2.604,5.822,5.822V340.786z M208.49,137.901c-18.618,0-33.766-15.146-33.766-33.765 c0-18.617,15.147-33.766,33.766-33.766c18.619,0,33.766,15.148,33.766,33.766C242.256,122.755,227.107,137.901,208.49,137.901z"></path> </g> </g></svg>
        <p style="color: #c9c6c6; font-style: italic;">To power this extension, we use OpenRouter.ai Platform. You will need an account there so you can control your own spending and data, as well as switch to paid plans if needed!</i></p>
        <br>
        <p>1. Visit <a style="text-decoration: none;" href="https://openrouter.ai/keys"><b>https://openrouter.ai/keys</b></a> website.<br>
        2. Sign up for a free account On OpenRouter (no credit card required).<br>
        3. Copy your API key and paste it into the input field above.<br>
        4. Click the "Save Settings" button below.<br>
        5. Enjoy using our extension!</p>
      `
    });
  });
});




// --- Generate and download PDF dictionary ---

// --- Download Dictionary Button ---

downloadBtn.addEventListener('click', () => {
  chrome.storage.local.get(['dictionaryEntries'], (data) => {
    const entries = data.dictionaryEntries || [];

    if (entries.length === 0) {
      alert("Dictionary is empty! Nothing to download.");
      return;
    }

    // Sorting entries by timestamp ascending 
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    generatePDF(entries);
  });
});

// --- PDF generation function ---
function generatePDF(entries) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let y = 20;

  doc.setFont("Helvetica");
  doc.setFontSize(12);

  // --- Summary page ---
  doc.setFontSize(16);
  doc.text("Instant Explain v.0.1. AI Dictionary Report", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);
  y += 7;
  doc.text(`Total entries: ${entries.length}`, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.text("Entries are listed in chronological order.", margin, y);
  y += 10;
  doc.text("Entries are presented in English.", margin, y);
  y += 10;

  doc.addPage();
  y = 15;

  // ---  each new entry ---
  entries.forEach((entry, idx) => {
    const date = new Date(entry.timestamp);
    const formattedDate = date.toLocaleString();

    const explanation = entry.explanation?.trim() || "(no explanation)";

    // Constructing PDF line without the word
    const text = `${idx + 1}. [${formattedDate}] — ${explanation}`;

    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 6.5;


    // Adding new page
    if (y > doc.internal.pageSize.height - 20) {
      doc.addPage();
      y = 15;
    }
  });

  // --- Saving PDF ---
  const fileName = `Instant_Explain_v.0.1._AI_Dictionary_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
