// References to UI elements
const totalImagesEl = document.getElementById('total-images');
const altPresentEl = document.getElementById('alt-text-present');
const altEmptyEl = document.getElementById('alt-text-empty');
const altMissingEl = document.getElementById('alt-text-missing');
const toggleAltButton = document.getElementById('toggle-alt-display');
const reloadButton = document.getElementById('reload-page');
const filterTypeEl = document.getElementById('filter-type');
const filterAltStatusEl = document.getElementById('filter-alt-status');
const imageListEl = document.getElementById('image-list');

let associatedTabId = null; // Store the ID of the tab this panel is CURRENTLY targeting
let allImagesData = [];
let isAltDisplayActive = false;

// Function to update the overview statistics
function updateOverview(images) {
    const total = images.length;
    const present = images.filter(img => img.altStatus === 'present').length;
    const empty = images.filter(img => img.altStatus === 'empty').length;
    const missing = images.filter(img => img.altStatus === 'missing').length;

    totalImagesEl.textContent = total;
    altPresentEl.textContent = present;
    altEmptyEl.textContent = empty;
    altMissingEl.textContent = missing;
}

// Function to render the image list based on filters
function renderImageList() {
    if (!associatedTabId) {
        imageListEl.innerHTML = '<li>Panel not associated with an active tab.</li>';
        return;
    }
    const typeFilter = filterTypeEl.value;
    const altFilter = filterAltStatusEl.value;

    const filteredImages = allImagesData.filter(img => {
        const typeMatch = typeFilter === 'all' || img.type === typeFilter;
        const altMatch = altFilter === 'all' || img.altStatus === altFilter;
        return typeMatch && altMatch;
    });

    imageListEl.innerHTML = ''; // Clear previous list

    if (filteredImages.length === 0) {
        imageListEl.innerHTML = '<li>No images match the current filters.</li>';
        return;
    }

    filteredImages.forEach(img => {
        const li = document.createElement('li');

        // Add thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.src = img.src || 'icons/placeholder.png'; // Handle missing src?
        thumbnail.classList.add('thumbnail');
        thumbnail.alt = 'Thumbnail';
        li.appendChild(thumbnail);

        // Add info
        const infoDiv = document.createElement('div');
        infoDiv.classList.add('info');
        infoDiv.innerHTML = `
            <p><strong>Src:</strong> ${img.src ? escapeHTML(img.src) : 'N/A'}</p>
            <p><strong>Alt:</strong> <span class="alt-status-${img.altStatus}">${escapeHTML(img.altValue !== null ? img.altValue : `(${img.altStatus})`)}</span></p>
            <p><strong>Type:</strong> ${img.type.toUpperCase()}</p>
        `;
        li.appendChild(infoDiv);

        imageListEl.appendChild(li);
    });
}

// --- Communication ---

// Function to request image data from the content script for the associated tab
async function requestImageData() {
    if (!associatedTabId) {
        console.warn("requestImageData called but no associatedTabId is set.");
        imageListEl.innerHTML = '<li>No active tab identified.</li>';
        return;
    }
    console.log(`Requesting image data from associated tab: ${associatedTabId}`);
    imageListEl.innerHTML = '<li>Loading image data...</li>'; // Provide feedback
    try {
        const response = await chrome.tabs.sendMessage(associatedTabId, { type: 'GET_IMAGE_DATA' });
        if (response && response.images) {
            allImagesData = response.images;
            updateOverview(allImagesData);
            renderImageList();
        } else if (response && response.error) {
             console.error("Content script error:", response.error);
             imageListEl.innerHTML = `<li>Error in content script: ${escapeHTML(response.error)}</li>`;
        } else {
            console.log("No response or no images found.");
            imageListEl.innerHTML = '<li>No images found on the page or content script not ready.</li>';
        }
    } catch (error) {
        console.error(`Error sending message to content script for tab ${associatedTabId}:`, error);
        if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
             // This error is common if the content script isn't injected or the tab is wrong (e.g., chrome:// URL)
             imageListEl.innerHTML = `<li>Could not connect to the page (ID: ${associatedTabId}). Is it a valid page (not chrome://)? Try reloading.</li>`;
        } else {
            imageListEl.innerHTML = `<li>Error fetching data: ${escapeHTML(error.message)}</li>`;
        }
        allImagesData = [];
        updateOverview(allImagesData);
        renderImageList(); // Render the error message
    }
}


// Function to send message to content script to toggle alt display for the associated tab
async function toggleAltDisplayOnPage() {
    if (!associatedTabId) {
        console.warn("toggleAltDisplayOnPage called before associatedTabId is set.");
        return;
    }
    isAltDisplayActive = !isAltDisplayActive;
    console.log(`Toggling alt display to ${isAltDisplayActive} on associated tab ${associatedTabId}`);
    try {
        await chrome.tabs.sendMessage(associatedTabId, { type: 'TOGGLE_ALT_DISPLAY', show: isAltDisplayActive });
        toggleAltButton.textContent = isAltDisplayActive ? 'Hide Alt Text' : 'Show Alt Text';
    } catch (error) {
        console.error(`Toggle alt display failed for tab ${associatedTabId}:`, error);
        isAltDisplayActive = !isAltDisplayActive;
        toggleAltButton.textContent = isAltDisplayActive ? 'Hide Alt Text' : 'Show Alt Text';
         imageListEl.innerHTML += `<li>Error toggling alt display: ${escapeHTML(error.message)}</li>`;
    }
}

// --- Initialization & Connection Check ---

// Attempts to inject content script if needed, then pings for connection.
async function ensureContentScriptReady(tabId, attempt = 1) {
    const MAX_INJECTION_ATTEMPTS = 3; // Try injecting a few times if it fails
    const MAX_PING_ATTEMPTS = 5;    // Ping attempts after presumed injection
    const RETRY_DELAY_MS = 500;

    console.log(`Ensure Script Attempt ${attempt}/${MAX_INJECTION_ATTEMPTS} for tab ${tabId}`);
    imageListEl.innerHTML = `<li>Preparing page analysis (attempt ${attempt})...</li>`;
    reloadButton.disabled = true;
    toggleAltButton.disabled = true;

    try {
        // 1. Attempt to inject the content script
        console.log(`Attempting to inject content.js into tab ${tabId}`);
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        console.log(`Successfully requested injection for content.js into tab ${tabId}.`);

        // 2. Injection requested, now start pinging
        await pingContentScript(tabId);

    } catch (error) {
        console.warn(`Error during ensureContentScriptReady (injection phase) for tab ${tabId}, attempt ${attempt}:`, error.message);

        // Check if error is because script already exists (common after first injection)
        // Note: Error message might vary across browsers/versions.
        if (error.message.includes("Cannot access a chrome:// URL") || error.message.includes("Missing host permission") || error.message.includes("No matching host permissions")) {
             imageListEl.innerHTML = `<li>Cannot analyze this page. Extension does not have permission for this URL (${escapeHTML(error.message)}).</li>`;
             // Don't retry if it's a permissions issue
             return;
        }
         if (error.message.includes("Script already injected") || error.message.includes("Duplicate script") || error.message.includes("Cannot create execution context")) {
             console.log("Content script likely already injected, proceeding to ping.");
             await pingContentScript(tabId); // Proceed to ping even if injection failed this way
         } else if (attempt < MAX_INJECTION_ATTEMPTS) {
            // Different error, retry injection
            console.log(`Retrying script injection/ping in ${RETRY_DELAY_MS}ms...`);
            setTimeout(() => ensureContentScriptReady(tabId, attempt + 1), RETRY_DELAY_MS);
        } else {
            // Max injection attempts reached for other errors
            console.error("Max injection attempts reached or unrecoverable error:", error.message);
            imageListEl.innerHTML = `<li>Error preparing page analysis: ${escapeHTML(error.message)}</li>`;
            // Keep buttons disabled
            associatedTabId = null;
        }
    }
}

// Pings content script after injection request, retries ping if necessary.
async function pingContentScript(tabId, attempt = 1) {
    const MAX_PING_ATTEMPTS = 8; // Allow more ping attempts after injection request
    const PING_RETRY_DELAY_MS = 400;

    console.log(`Ping attempt ${attempt}/${MAX_PING_ATTEMPTS} for tab ${tabId}`);
     imageListEl.innerHTML = `<li>Connecting to page script (attempt ${attempt})...</li>`;

    try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'PING_CONTENT_SCRIPT' });
        if (response && response.type === 'PONG') {
            console.log("PONG received. Connection established.");
            associatedTabId = tabId; // Set the active tab ID
            reloadButton.disabled = false;
            toggleAltButton.disabled = false;
            await requestImageData(); // Request actual data
        } else {
            throw new Error(`Unexpected PING response: ${JSON.stringify(response)}`);
        }
    } catch (error) {
        console.warn(`Ping attempt ${attempt} failed for tab ${tabId}:`, error.message);
        if (attempt < MAX_PING_ATTEMPTS) {
            console.log(`Retrying ping in ${PING_RETRY_DELAY_MS}ms...`);
            setTimeout(() => pingContentScript(tabId, attempt + 1), PING_RETRY_DELAY_MS);
        } else {
            console.error("Max ping attempts reached. Could not connect.");
            imageListEl.innerHTML = `<li>Error: Still could not connect to page script after injection and ${MAX_PING_ATTEMPTS} pings. Reload page/extension. Details: ${escapeHTML(error.message)}</li>`;
            reloadButton.disabled = true;
            toggleAltButton.disabled = true;
            associatedTabId = null;
        }
    }
}


// Initialize the panel by finding the active tab and ensuring the script is ready
async function initPanel() {
    console.log("Panel initPanel started.");
    reloadButton.disabled = true;
    toggleAltButton.disabled = true;
    imageListEl.innerHTML = '<li>Identifying active tab...</li>';
    associatedTabId = null;
    allImagesData = [];
    isAltDisplayActive = false;
    toggleAltButton.textContent = 'Show Alt Text';

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.id) {
            console.log("Panel targeting active tab:", tab.id);
            // No need to check URL scheme here, executeScript will fail if invalid
            console.log("Ensuring content script is ready...");
            await ensureContentScriptReady(tab.id);
        } else {
            console.error("Could not find active tab during initialization.");
            imageListEl.innerHTML = '<li>Error: Could not find active tab.</li>';
        }
    } catch (error) {
        console.error("Error during panel initialization query:", error);
        imageListEl.innerHTML = `<li>Error initializing panel: ${escapeHTML(error.message)}</li>`;
    }
}

// Initial setup when the panel's HTML content is loaded
document.addEventListener('DOMContentLoaded', initPanel);

// Reload button should re-run initPanel, which now handles injection and connection
reloadButton.addEventListener('click', async () => {
    console.log("Reload button clicked. Finding active tab...");
    imageListEl.innerHTML = '<li>Initiating reload...</li>';
    reloadButton.disabled = true;
    toggleAltButton.disabled = true;

    try {
        let [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab && currentTab.id) {
            console.log(`Calling chrome.tabs.reload for tab ${currentTab.id}`);
            await chrome.tabs.reload(currentTab.id);
            console.log(`chrome.tabs.reload for tab ${currentTab.id} call completed.`);
            const reloadDelay = 1000; // Shorter delay might be okay now? Test.
            console.log(`Scheduling panel re-initialization (inc. injection) after ${reloadDelay}ms reload delay...`);
            setTimeout(() => {
                console.log(`Executing initPanel after ${reloadDelay}ms delay.`);
                initPanel();
            }, reloadDelay);
        } else {
            console.error("Could not find active tab to reload.");
            imageListEl.innerHTML = '<li>Error: Could not find active tab.</li>';
            reloadButton.disabled = false;
            toggleAltButton.disabled = false;
        }
    } catch (error) {
        console.error("Error during reload process:", error);
        imageListEl.innerHTML = `<li>Error during reload: ${escapeHTML(error.message)}</li>`;
        reloadButton.disabled = false;
        toggleAltButton.disabled = false;
    }
});

// Tab activation/update listeners should also call initPanel
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("Tab activated event, re-initializing panel for tab:", activeInfo.tabId);
    await initPanel();
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Re-init only if the *active* tab finishes loading
    if (changeInfo.status === 'complete') {
         let [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
         if(activeTab && activeTab.id === tabId){
             console.log(`Detected update completion for active tab ${tabId}. Re-initializing panel.`);
             await initPanel();
         }
    }
});

// Utility function to escape HTML
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"/]/g, function (s) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        }[s];
    });
}

// Note: The more robust Port connection logic is removed as it was
// primarily beneficial for DevTools<->Background communication.
// Direct tabs.sendMessage is generally sufficient for SidePanel<->ContentScript. 