// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const focusBtn = document.getElementById("focus-btn");
  const relaxBtn = document.getElementById("relax-btn");
  const focusIcon = document.getElementById("focus-icon");
  const relaxIcon = document.getElementById("relax-icon");
  const focusResetIcon = document.getElementById("focus-reset-icon");
  const relaxResetIcon = document.getElementById("relax-reset-icon");

  if (!focusBtn || !relaxBtn || !focusIcon || !relaxIcon) {
    console.error("Missing DOM elements");
    return;
  }

  const playIcon = "https://img.icons8.com/ios-glyphs/30/FFFFFF/play--v1.png";
  const pauseIcon = "https://img.icons8.com/ios-glyphs/30/FFFFFF/pause--v1.png";

  let focusTimerInterval = null;
  let relaxTimerInterval = null;
  let focusStartTime = null;
  let relaxStartTime = null;
  let focusElapsed = 0;
  let relaxElapsed = 0;
  let focusPaused = true;
  let relaxPaused = true;
  let focusFrozenByInactivity = false;

  

  // 1. Set your daily focus goal (in ms)
  const DAILY_FOCUS_GOAL_MS = 10 * 1000; // 10 seconds for demo

  let focusGoalCompleted = false;

  //
  function setTimerDisplay(timerId, timeStr) {
    const timerElem = document.getElementById(timerId);
    if (timerElem) timerElem.textContent = timeStr;
  }
  // 2. Get the elapsed time ( elapsed time means the time that has passed since the timer started)

  function getElapsedTime(startTime, elapsed, paused) {
    if (paused || !startTime) return formatTime(elapsed);
    const now = Date.now();
    const totalElapsed = elapsed + (now - startTime);
    return formatTime(totalElapsed);
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // 2. Calculate progress (0 to 1)
  function getFocusProgress() {
    // If timer is running, calculate up-to-date elapsed
    let currentElapsed = focusElapsed;
    if (!focusPaused && focusStartTime) {
      currentElapsed += Date.now() - focusStartTime;
    }
    return Math.min(currentElapsed / DAILY_FOCUS_GOAL_MS, 1.0);
  }


  function getRelaxProgress() {
    let currentElapsed = relaxElapsed;
    if (!relaxPaused && relaxStartTime) {
      currentElapsed += Date.now() - relaxStartTime;
    }
    return Math.min(currentElapsed / DAILY_FOCUS_GOAL_MS, 1.0);
  }
  // 3. Update the neon progress ring
  function updateFocusProgressRing() {
    const progressRing = document.querySelector('.card .progress-ring-focus');
    if (!progressRing) return;
    const percent = getFocusProgress();
    const angle = percent * 360;
    // Neon color: #00ffe0
    progressRing.style.background = `conic-gradient(
      #00ffe0 ${angle}deg,
      #2c2c2c ${angle}deg 360deg
    )`;
  }
  function updateRelaxProgressRing() {
    const progressRing = document.querySelector('.card .progress-ring-relax');
    if (!progressRing) return;
    const percent = getRelaxProgress();
    const angle = percent * 360;
    // Neon color: #00ffe0  
    progressRing.style.background = `conic-gradient(
      #00ffe0 ${angle}deg,
      #2c2c2c ${angle}deg 360deg
    )`;
  } 

  // 4. Send completion notification (only once per completion)
  function checkFocusGoalCompletion() {
    if (!focusGoalCompleted && getFocusProgress() >= 1.0) {
      focusGoalCompleted = true;
      chrome.runtime.sendMessage({
        action: "FOCUS_GOAL_COMPLETED"
      });
    }
  }

  // 5. Start the focus timer
  function startFocusTimer() {
    if (focusTimerInterval) clearInterval(focusTimerInterval);
    focusTimerInterval = setInterval(() => {
      setTimerDisplay(
        "focus-timer",
        getElapsedTime(focusStartTime, focusElapsed, focusPaused)
      );
      updateFocusProgressRing();
      checkFocusGoalCompletion();
    }, 1000);
  }

  function stopFocusTimer() {
    if (focusTimerInterval) clearInterval(focusTimerInterval);
    focusTimerInterval = null;
    setTimerDisplay("focus-timer", formatTime(focusElapsed));
  }

  function startRelaxTimer() {
    if (relaxTimerInterval) clearInterval(relaxTimerInterval);
    relaxTimerInterval = setInterval(() => {
      setTimerDisplay(
        "relax-timer",
        getElapsedTime(relaxStartTime, relaxElapsed, relaxPaused)
      );
      updateRelaxProgressRing();
    }, 1000);
  }

  function stopRelaxTimer() {
    if (relaxTimerInterval) clearInterval(relaxTimerInterval);
    relaxTimerInterval = null;
    setTimerDisplay("relax-timer", formatTime(relaxElapsed));
  }

  function updateUI(mode) {
    if (mode === "FOCUSING") {
      focusBtn.textContent = focusPaused ? "FOCUS" : "FOCUSING";
      relaxBtn.textContent = "START MEETING";
      focusIcon.src = focusPaused ? playIcon : pauseIcon;
      relaxIcon.src = playIcon;
    } else if (mode === "RELAXING") {
      focusBtn.textContent = "FOCUS";
      relaxBtn.textContent = relaxPaused ? "START MEETING" : "IN-MEETING";
      focusIcon.src = playIcon;
      relaxIcon.src = relaxPaused ? playIcon : pauseIcon;
    } else {
      focusBtn.textContent = "FOCUS";
      relaxBtn.textContent = "START MEETING";
      focusIcon.src = playIcon;
      relaxIcon.src = playIcon;
    }
  }

  function updateActivity(mode) {
    if (mode === "FOCUSING") {
      chrome.runtime.sendMessage({ action: "FOCUS", state: mode });
    } else if (mode === "RELAXING") {
      chrome.runtime.sendMessage({ action: "RELAX", state: mode });
    }
  }

  // Load state from storage on popup open
  chrome.storage.local.get(
    [
      "mode",
      "focusStartTime",
      "relaxStartTime",
      "focusElapsed",
      "relaxElapsed",
      "focusPaused",
      "relaxPaused",
      "focusFrozenByInactivity",
    ],
    (result) => {
      const mode = result.mode || "NONE";
      focusStartTime = result.focusStartTime || null;
      relaxStartTime = result.relaxStartTime || null;
      focusElapsed = result.focusElapsed || 0;
      relaxElapsed = result.relaxElapsed || 0;
      focusPaused =
        result.focusPaused !== undefined ? result.focusPaused : true;
      relaxPaused =
        result.relaxPaused !== undefined ? result.relaxPaused : true;
      focusFrozenByInactivity = result.focusFrozenByInactivity || false;

      updateUI(mode);
      setTimerDisplay(
        "focus-timer",
        getElapsedTime(focusStartTime, focusElapsed, focusPaused)
      );
      setTimerDisplay(
        "relax-timer",
        getElapsedTime(relaxStartTime, relaxElapsed, relaxPaused)
      );

      if (focusFrozenByInactivity && mode === "FOCUSING") {
        focusPaused = true;
        if (focusStartTime) {
          focusElapsed += Date.now() - focusStartTime;
        }
        focusStartTime = null;
        setTimerDisplay("focus-timer", formatTime(focusElapsed));
        stopFocusTimer();
        focusBtn.textContent = "START AGAIN";
        focusIcon.src = playIcon;
        return;
      }

      if (mode === "FOCUSING" && !focusPaused && !focusFrozenByInactivity) {
        startFocusTimer();
        stopRelaxTimer();
      } else if (mode === "RELAXING" && !relaxPaused) {
        startRelaxTimer();
        stopFocusTimer();
      } else if (focusFrozenByInactivity === true && mode === "FOCUSING") {
        focusPaused = true;
        focusStartTime = null;
        focusElapsed = 0;
        setTimerDisplay("focus-timer", formatTime(focusElapsed));
        stopFocusTimer();
        focusBtn.textContent = "START AGAIN";
        focusIcon.src = playIcon;
      } else {
        stopFocusTimer();
        stopRelaxTimer();
      }
    }
  );

  // FOCUS button handler
  focusBtn.addEventListener("click", () => {
    chrome.storage.local.get(
      [
        "mode",
        "focusStartTime",
        "focusElapsed",
        "focusPaused",
        "relaxStartTime",
        "relaxElapsed",
        "relaxPaused",
        "focusFrozenByInactivity",
      ],
      (result) => {
        let mode = "FOCUSING";
        focusElapsed = result.focusElapsed || 0;
        focusPaused =
          result.focusPaused !== undefined ? result.focusPaused : true;
        relaxElapsed = result.relaxElapsed || 0;
        relaxPaused =
          result.relaxPaused !== undefined ? result.relaxPaused : true;
        focusFrozenByInactivity = result.focusFrozenByInactivity || false;

        if (focusFrozenByInactivity) {
          // Reset and start again
          focusElapsed = 0;
          focusPaused = false;
          focusStartTime = Date.now();
          focusFrozenByInactivity = false;
          mode = "FOCUSING";
          chrome.storage.local.set(
            {
              focusFrozenByInactivity: false,
              focusElapsed: 0,
              focusPaused: false,
              focusStartTime,
              mode,
            },
            () => {
              updateUI(mode);
              startFocusTimer();
              stopRelaxTimer();
              setTimerDisplay("focus-timer", formatTime(0));
              updateActivity(mode);
            }
          );
          return;
        }

        if (result.mode === "FOCUSING" && !focusPaused) {
          // Pause focus
          focusPaused = true;
          if (result.focusStartTime) {
            focusElapsed += Date.now() - result.focusStartTime;
          }
          focusStartTime = null;

          chrome.storage.local.set(
            {
              mode,
              focusPaused: true,
              focusElapsed,
              focusStartTime: null,
              relaxPaused,
            },
            () => {
              updateUI(mode);
              stopFocusTimer();
              setTimerDisplay("focus-timer", formatTime(focusElapsed));
              stopRelaxTimer();
              // Explicitly signal the background that focus has stopped
              chrome.runtime.sendMessage({ action: "FOCUS", state: "STOPPED" });
            }
          );
        } else {
          // Resume/start focus, pause relax
          focusPaused = false;
          focusStartTime = Date.now();
          if (!relaxPaused && result.relaxStartTime) {
            relaxElapsed += Date.now() - result.relaxStartTime;
          }
          relaxPaused = true;

          chrome.storage.local.set(
            {
              mode,
              focusPaused: false,
              focusStartTime,
              focusElapsed,
              relaxPaused,
              relaxElapsed,
              relaxStartTime: result.relaxStartTime,
            },
            () => {
              updateUI(mode);
              startFocusTimer();
              stopRelaxTimer();
                
            }
          );
        }

        updateActivity(mode);
      }
    );
  });

  // RELAX button handler
  relaxBtn.addEventListener("click", () => {
    chrome.storage.local.get(
      [
        "mode",
        "relaxStartTime",
        "relaxElapsed",
        "relaxPaused",
        "focusStartTime",
        "focusElapsed",
        "focusPaused",
      ],
      (result) => {
        let mode = "RELAXING";
        relaxElapsed = result.relaxElapsed || 0;
        relaxPaused =
          result.relaxPaused !== undefined ? result.relaxPaused : true;
        focusElapsed = result.focusElapsed || 0;
        focusPaused =
          result.focusPaused !== undefined ? result.focusPaused : true;

        if (result.mode === "RELAXING" && !relaxPaused) {
          // Pause relax
          relaxPaused = true;
          if (result.relaxStartTime) {
            relaxElapsed += Date.now() - result.relaxStartTime;
          }
          relaxStartTime = null;

          chrome.storage.local.set(
            {
              mode,
              relaxPaused: true,
              relaxElapsed,
              relaxStartTime: null,
              focusPaused,
            },
            () => {
              updateUI(mode);
              stopRelaxTimer();
              setTimerDisplay("relax-timer", formatTime(relaxElapsed));
              stopFocusTimer();
              // Explicitly signal the background that relax has stopped
              chrome.runtime.sendMessage({ action: "RELAX", state: "STOPPED" });
            }
          );
        } else {
          // Resume/start relax, pause focus
          relaxPaused = false;
          relaxStartTime = Date.now();
          if (!focusPaused && result.focusStartTime) {
            focusElapsed += Date.now() - result.focusStartTime;
          }
          focusPaused = true;

          chrome.storage.local.set(
            {
              mode,
              relaxPaused: false,
              relaxStartTime,
              relaxElapsed,
              focusPaused,
              focusElapsed,
              focusStartTime: result.focusStartTime,
            },
            () => {
              updateUI(mode);
              startRelaxTimer();
              stopFocusTimer();
            }
          );
        }

        updateActivity(mode);
      }
    );
  });

  // RESET icons
  if (focusResetIcon) {
    focusResetIcon.addEventListener("click", () => {
      focusElapsed = 0;
      focusStartTime = null;
      focusFrozenByInactivity = false;
      focusPaused = true;
      updateFocusProgressRing();
    
      
      
      chrome.storage.local.set(
        { focusElapsed: 0, focusStartTime: null, focusPaused: true, focusFrozenByInactivity: false },
        () => {
          setTimerDisplay("focus-timer", formatTime(0));
          chrome.runtime.sendMessage({ action: "FOCUS", state: "STOPPED" });
          stopFocusTimer();
          chrome.storage.local.get(["mode"], (result) => {
            if (result.mode !== "FOCUSING" || focusPaused) {
              focusBtn.textContent = "FOCUS";
              focusIcon.src = playIcon;
            }
          });
        }
      );
    });
  }

  if (relaxResetIcon) {
    relaxResetIcon.addEventListener("click", () => {
      relaxElapsed = 0;
      relaxStartTime = null;
      relaxPaused = true;
      updateRelaxProgressRing();
     
      chrome.storage.local.set(
        { relaxElapsed: 0, relaxStartTime: null, relaxPaused: true },
        () => {
          setTimerDisplay("relax-timer", formatTime(0));
          stopRelaxTimer();
        
          chrome.storage.local.get(["mode"], (result) => {
            if (result.mode !== "RELAXING" || relaxPaused) {
              relaxBtn.textContent = "START MEETING";
              relaxIcon.src = playIcon;
            }
          });
        }
      );
    });
  }

  // Listen for background freeze message
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "FREEZE_FOCUS_TIMER") {
      stopFocusTimer();
      focusPaused = true;
      focusFrozenByInactivity = true;
      if (focusStartTime) {
        focusElapsed += Date.now() - focusStartTime;
      }
      focusStartTime = null;
      chrome.storage.local.set(
        {
          focusPaused: true,
          focusElapsed,
          focusStartTime: null,
          focusFrozenByInactivity: true,
        },
        () => {
          updateUI("FOCUSING");
          setTimerDisplay("focus-timer", formatTime(focusElapsed));
          focusBtn.textContent = "START AGAIN";
          focusIcon.src = playIcon;
        }
      );
    }
  });

  // 7. Also update the ring on popup load and after state loads
  updateFocusProgressRing();
  updateRelaxProgressRing();

});
