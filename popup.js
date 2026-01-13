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

// --- Load settings from chrome.storage.local ---
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get([
    'apiKey', 'explanationDepth', 'explanationLanguage',
    'font', 'textSize', 'dualLanguage', 'dictionaryMode'
  ], (data) => {
    apiKeyInput.value = data.apiKey || '';
    explanationDepth.value = data.explanationDepth || 'normal';
    explanationLanguage.value = data.explanationLanguage || 'en';
    fontSelect.value = data.font || 'Arial';
    textSizeSelect.value = data.textSize || '14';
    dualLanguage.value = data.dualLanguage || 'none';
    dictionaryMode.checked = data.dictionaryMode || false;
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
  }, () => {
    alert('All set! Settings saved securely.');
  });
});

// --- Download dictionary stub ---
downloadBtn.addEventListener('click', () => {
  alert('Dictionary download started… ');
});

// --- Usage policy link ---
usagePolicy.addEventListener('click', () => {
  chrome.tabs.create({ url: '#' });
});