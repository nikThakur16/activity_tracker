// Only run on http(s) pages to avoid issues with system pages
if (window.location.protocol.startsWith('http')) {
    const TRACKER_FLAG = '__focusTrackerLoaded__';
  
    if (!window[TRACKER_FLAG]) {
      window[TRACKER_FLAG] = true;
  
      let monitoring = false;
      let lastMouseMove = 0;
  
      function sendActivity(type) {
        if (!monitoring) return;
  
        try {
          chrome.runtime.sendMessage({ activityType: type, timestamp: Date.now() });
        } catch (e) {
          console.warn("Failed to send activity message:", e);
        }
      }
  
      // Debounced mouse movement detection (1 message per second)
      document.addEventListener("mousemove", () => {
        const now = Date.now();
        if (now - lastMouseMove > 1000) {
          lastMouseMove = now;
          sendActivity("mouse");
        }
      });
  
      document.addEventListener("keydown", () => sendActivity("keyboard"));
      document.addEventListener("click", () => sendActivity("click"));
  
      // Listen for enable/disable messages from background
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "ENABLE_MONITORING") {
          monitoring = true;
        } else if (message.action === "DISABLE_MONITORING") {
          monitoring = false;
        }
      });
  
      // ✅ Script loaded once, activity tracking now active
    }
  }
  