let focusInactivityTimeout = null;
let focusActive = false;
const INACTIVITY_LIMIT_MS = 5000; // 5 seconds

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.activityType) {
    const time = new Date(message.timestamp).toLocaleTimeString();
    console.log(`[Activity] ${message.activityType} at ${time}`);
    if (focusActive) {
      resetFocusInactivityTimer();
    }
  }

  if (message.action === "FOCUS") {
    if (message.state === "FOCUSING") {
      focusActive = true;
      chrome.storage.local.set({ focusFrozenByInactivity: false });
      enableMonitoring();
      resetFocusInactivityTimer();
      console.log("Focus started");
    } else {
      focusActive = false;
      chrome.storage.local.set({ focusFrozenByInactivity: false });
      disableMonitoring();
      clearFocusInactivityTimer();
      console.log("Focus stopped");
    }
  } else if (message.action === "RELAX") {
    focusActive = false;
    chrome.storage.local.set({ focusFrozenByInactivity: false });
    disableMonitoring();
    clearFocusInactivityTimer();
    console.log("Relax started/stopped");
  }
});

// ✅ Timer Control
function resetFocusInactivityTimer() {
  clearFocusInactivityTimer();
  focusInactivityTimeout = setTimeout(() => {
    if (focusActive) {
      chrome.storage.local.set({ focusFrozenByInactivity: true }, () => {
        chrome.runtime.sendMessage({ action: "FREEZE_FOCUS_TIMER" });
        showInactivityNotification();
      });
    }
  }, INACTIVITY_LIMIT_MS);
}

function clearFocusInactivityTimer() {
  if (focusInactivityTimeout) {
    clearTimeout(focusInactivityTimeout);
    focusInactivityTimeout = null;
  }
}

// ✅ Inject content script to all valid tabs
function enableMonitoring() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (isValidTab(tab) && typeof tab.id === "number") {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Script inject failed or already injected:', chrome.runtime.lastError.message);
          } else {
            chrome.tabs.sendMessage(tab.id, { action: "ENABLE_MONITORING" });
          }
        });
      }
    });
  });
}

function disableMonitoring() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (isValidTab(tab) && typeof tab.id === "number") {
        chrome.tabs.sendMessage(tab.id, { action: "DISABLE_MONITORING" });
      }
    });
  });
}

function isValidTab(tab) {
  return tab.url && /^https?:\/\//.test(tab.url);
}

// ✅ Show a Chrome notification when timer is frozen due to inactivity
function showInactivityNotification() {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons8-clock.gif',
      title: 'Focus Timer Frozen',
      message: 'No activity detected for 5 seconds. Click FOCUS to start again.'
    });
  }
}
