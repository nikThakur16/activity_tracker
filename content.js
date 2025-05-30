// Only run on http(s) pages to avoid issues with system pages


if (window.location.protocol.startsWith("http")) {
  chrome.runtime.sendMessage({ action: "CONTENT_READY" });
  const TRACKER_FLAG = "__focusTrackerLoaded__";

  if (!window[TRACKER_FLAG]) {
    window[TRACKER_FLAG] = true;

    let monitoring = false;
    let lastMouseMove = 0;

    function sendActivity(type) {
      if (!monitoring) return;

      try {
        console.log(`[Activity] ${type} at ${new Date().toISOString()}`);

        chrome.runtime.sendMessage({
          activityType: type,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("Failed to send activity message:", e);
      }
    }

    // Mouse movement (debounced: 1 message per second)
    document.addEventListener("mousemove", () => {
      const now = Date.now();
      if (now - lastMouseMove > 1000) {
        lastMouseMove = now;
        sendActivity("mouse");
      }
    });

    // Mouse click
    document.addEventListener("click", () => sendActivity("click"));
    document.addEventListener("keypress", () => sendActivity("keypress"));

    document.addEventListener("keyup", () => sendActivity("keyup"));

    document.addEventListener("wheel", () => sendActivity("wheel"));

    document.addEventListener("mouseup", () => sendActivity("mouseup"));
    document.addEventListener("mousedown", () => sendActivity("mousedown"));
   

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Tab is inactive or user switched to another tab/window
        console.log("User left the tab");
        sendActivity("tab-inactive");
      } else if (document.visibilityState === "visible") {
        // Tab is active again
        console.log("User returned to the tab");
        sendActivity("tab-active");
      }
    });



    // Keyboard press (with debug and input check)
    document.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName))
        return;
      console.log("Keydown detected", e);
      sendActivity("keyboard");
    });

    // Optional: Scroll and touch for mobile users
    // document.addEventListener("scroll", () => sendActivity("scroll"));
    // document.addEventListener("touchstart", () => sendActivity("touch"));

    // Handle messages from background to enable/disable tracking
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "ENABLE_MONITORING") {
        monitoring = true;
        console.log("[FocusTracker] Monitoring ENABLED");
      } else if (message.action === "DISABLE_MONITORING") {
        monitoring = false;
        console.log("[FocusTracker] Monitoring DISABLED");
      }
    });

    console.log("[FocusTracker] Content script loaded ✅");
  }
}

