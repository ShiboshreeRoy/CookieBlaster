document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle');
    const intervalInput = document.getElementById('interval');
    const cleanNowBtn = document.getElementById('cleanNow');
    const cookieCount = document.getElementById('cookieCount');
    const lastCleaned = document.getElementById('lastCleaned');

    // Load saved settings
    chrome.storage.sync.get(['isRunning', 'interval', 'cookieCount', 'lastCleaned'], (data) => {
        toggle.checked = data.isRunning ?? false;
        intervalInput.value = data.interval ?? 15;
        cookieCount.textContent = data.cookieCount ?? 0;
        lastCleaned.textContent = data.lastCleaned ?? '-';
    });

    // Toggle Auto-Clean
    toggle.addEventListener('change', () => {
        const isRunning = toggle.checked;
        chrome.storage.sync.set({ isRunning });

        chrome.runtime.sendMessage({
            action: isRunning ? 'start' : 'stop',
            interval: parseInt(intervalInput.value, 10),
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("Auto-clean state updated:", response);
            }
        });
    });

    // Update Interval
    intervalInput.addEventListener('change', () => {
        let interval = parseInt(intervalInput.value, 10);
        if (interval < 1) {
            interval = 1;
            intervalInput.value = 1;
        }
        chrome.storage.sync.set({ interval });

        chrome.runtime.sendMessage({
            action: 'restart',
            interval: interval,
        });
    });

    // Manual Clean Button
    cleanNowBtn.addEventListener('click', () => {
        cleanNowBtn.disabled = true;

        chrome.runtime.sendMessage({ action: 'cleanNow' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending cleanNow message:", chrome.runtime.lastError);
                cleanNowBtn.disabled = false;
                return;
            }

            chrome.storage.sync.get(['cookieCount', 'lastCleaned'], (data) => {
                cookieCount.textContent = data.cookieCount ?? 0;
                lastCleaned.textContent = data.lastCleaned ?? '-';
                cleanNowBtn.disabled = false;
            });
        });
    });
});

// Listen for background updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateStats') {
        chrome.storage.sync.get(['cookieCount', 'lastCleaned'], (data) => {
            document.getElementById('cookieCount').textContent = data.cookieCount ?? 0;
            document.getElementById('lastCleaned').textContent = data.lastCleaned ?? '-';
        });
    }
});
