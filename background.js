// background.js - Service Worker

console.log("Image Accessibility Analyzer: Background script started.");

// --- Side Panel Behavior Setup ---

// Configure the default behavior: open the side panel when the action icon is clicked.
(async () => {
    try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        console.log("Side panel behavior set to open on action click.");
    } catch (error) {
        console.error("Error setting side panel behavior:", error);
    }
})();


// --- Side Panel Logic (Minimal) ---

// We don't strictly need the onClicked listener anymore if setPanelBehavior is working,
// but it can be useful for debugging or future features.
chrome.action.onClicked.addListener((tab) => {
    console.log(`Action clicked on tab: ${tab.id}. Panel should open via behavior setting.`);
    // No need to track tabId or call setOptions here anymore.
});


// --- Message Handling (Removed) ---
// No longer need to handle GET_PANEL_TAB_ID

// Optional Lifecycle listeners can remain if needed for other purposes

console.log("Background script setup complete."); 