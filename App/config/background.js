let isRunning = false;
let intervalMinutes = 15;

chrome.storage.sync.get(['isRunning', 'interval'], (data) => {
    isRunning = data.isRunning ?? false;
    intervalMinutes = data.interval ?? 15;
    if (isRunning) {
        startCleaning();
    }
});

// Start Auto-Cleaning
function startCleaning() {
    chrome.alarms.clear('cookieClean', () => {
        chrome.alarms.create('cookieClean', {
            periodInMinutes: intervalMinutes
        });
    });
    console.log(`Auto-clean started, every ${intervalMinutes} minutes.`);
}

// Stop Auto-Cleaning
function stopCleaning() {
    chrome.alarms.clear('cookieClean');
    console.log("Auto-clean stopped.");
}

// Clean Cookies Function
async function cleanCookies() {
    try {
        const cookies = await chrome.cookies.getAll({});
        let removedCount = 0;

        for (let cookie of cookies) {
            await chrome.cookies.remove({
                url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                name: cookie.name
            }).catch(() => {}); // Ignore errors
            removedCount++;
        }

        // Save stats
        chrome.storage.sync.set({
            lastCleaned: new Date().toLocaleString(),
            cookieCount: removedCount
        });

        // Notify user
        if (removedCount > 0) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Cookies Cleaned',
                message: `${removedCount} cookies removed!`
            });
        }

        // Update Popup
        chrome.runtime.sendMessage({ action: 'updateStats' });

    } catch (error) {
        console.error("Error cleaning cookies:", error);
    }
}

// Handle Scheduled Cleanups
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cookieClean') {
        cleanCookies();
    }
});

// Handle Messages from Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
        isRunning = true;
        intervalMinutes = message.interval ?? intervalMinutes;
        chrome.storage.sync.set({ isRunning, interval: intervalMinutes });
        startCleaning();
        sendResponse({ success: true });

    } else if (message.action === 'stop') {
        isRunning = false;
        chrome.storage.sync.set({ isRunning });
        stopCleaning();
        sendResponse({ success: true });

    } else if (message.action === 'restart') {
        intervalMinutes = message.interval;
        chrome.storage.sync.set({ interval: intervalMinutes });

        if (isRunning) {
            stopCleaning();
            startCleaning();
        }
        sendResponse({ success: true });

    } else if (message.action === 'cleanNow') {
        cleanCookies();
        sendResponse({ success: true });

    } else {
        sendResponse({ success: false, error: "Unknown action" });
    }

    return true; // Keep sendResponse valid for async use
});
