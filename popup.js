// Initialize when the popup loads
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const inputText = document.getElementById('inputText');
    const simplifyBtn = document.getElementById('simplifyBtn');
    const simplifiedText = document.getElementById('simplifiedText');
    
    // Handle the simplify button click
    simplifyBtn.addEventListener('click', function() {
        const textToSimplify = inputText.value.trim();
        
        if (textToSimplify) {
            // Show loading state
            simplifiedText.textContent = "Simplifying...";
            
            // First, check if API key exists
            chrome.storage.sync.get(['cohere_api_key'], function(result) {
                if (!result.cohere_api_key) {
                    simplifiedText.textContent = "Error: Please set your Cohere API key in the settings.";
                    return;
                }
                
                console.log("Sending text to background for simplification");
                
                // Send to background script for processing
                chrome.runtime.sendMessage({
                    action: "getAISummary",
                    data: {
                        title: "User Input",
                        content: textToSimplify
                    }
                }, function(response) {
                    console.log("Response from background:", response);
                    
                    if (response && response.success) {
                        // Display simplified version
                        simplifiedText.textContent = response.simplified;
                    } else {
                        // Show detailed error message
                        const errorMsg = response?.error || "Unknown error occurred";
                        console.error("Simplification error:", errorMsg);
                        simplifiedText.textContent = "Error: " + errorMsg;
                    }
                });
            });
        } else {
            simplifiedText.textContent = "Please enter some text to simplify.";
        }
    });
    
    // Check if there's selected text when popup opens
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: getSelectedText
        }, function(results) {
            if (results && results[0] && results[0].result) {
                inputText.value = results[0].result;
            }
        });
    });
    
    // Add settings button functionality
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settingsBtn';
    settingsBtn.textContent = 'Settings';
    document.body.insertBefore(settingsBtn, document.querySelector('#outputContainer'));
    
    // Create a settings panel (initially hidden)
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settingsPanel';
    settingsPanel.style.display = 'none';
    settingsPanel.innerHTML = `
        <h3>API Settings</h3>
        <label for="apiKey">Cohere API Key:</label>
        <input type="password" id="apiKey" placeholder="Enter your Cohere API key">
        <button id="saveSettings">Save</button>
    `;
    document.body.insertBefore(settingsPanel, document.querySelector('#outputContainer'));
    
    // Toggle settings panel
    settingsBtn.addEventListener('click', function() {
        if (settingsPanel.style.display === 'none') {
            settingsPanel.style.display = 'block';
            // Load saved API key if exists
            chrome.storage.sync.get(['cohere_api_key'], function(result) {
                if (result.cohere_api_key) {
                    document.getElementById('apiKey').value = result.cohere_api_key;
                }
            });
        } else {
            settingsPanel.style.display = 'none';
        }
    });
    
    // Save API key
    document.getElementById('saveSettings').addEventListener('click', function() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (apiKey) {
            chrome.storage.sync.set({cohere_api_key: apiKey}, function() {
                alert('API key saved!');
                settingsPanel.style.display = 'none';
            });
        } else {
            alert('Please enter a valid API key.');
        }
    });
    
    // Add test button for direct API verification
    const testApiBtn = document.createElement('button');
    testApiBtn.id = 'testApiBtn';
    testApiBtn.textContent = 'Test API Connection';
    testApiBtn.style.marginTop = '10px';
    testApiBtn.style.width = '100%';
    testApiBtn.style.padding = '8px';
    testApiBtn.style.backgroundColor = '#ff9800';
    testApiBtn.style.color = 'white';
    testApiBtn.style.border = 'none';
    testApiBtn.style.borderRadius = '5px';
    testApiBtn.style.cursor = 'pointer';
    settingsPanel.appendChild(testApiBtn);
    
    // Test API connection
    testApiBtn.addEventListener('click', function() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) {
            alert('Please enter an API key to test.');
            return;
        }
        
        testApiBtn.textContent = 'Testing...';
        testApiBtn.disabled = true;
        
        chrome.runtime.sendMessage({
            action: "testApiConnection",
            apiKey: apiKey
        }, function(response) {
            testApiBtn.disabled = false;
            testApiBtn.textContent = 'Test API Connection';
            
            if (response && response.success) {
                alert('API connection successful!');
            } else {
                alert('API connection failed: ' + (response?.error || 'Unknown error'));
            }
        });
    });
});

// Function to get selected text from the active tab
function getSelectedText() {
    return window.getSelection().toString();
}
