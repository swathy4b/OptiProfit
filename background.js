// Background script for OptiProfit extension

// Initialize on extension installation
chrome.runtime.onInstalled.addListener(function() {
    // Initialize default settings
    chrome.storage.local.get('settings', function(data) {
      if (!data.settings) {
        chrome.storage.local.set({
          settings: {
            isActive: true,
            platform: 'auto',
            alertThreshold: 20,
            autoIntervention: true
          }
        });
      }
    });
    
    // Set up demo badge for first install
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        chrome.action.setBadgeText({
          text: 'NEW',
          tabId: tabs[0].id
        });
        
        chrome.action.setBadgeBackgroundColor({
          color: '#2196F3',
          tabId: tabs[0].id
        });
        
        // Clear the "NEW" badge after 5 seconds
        setTimeout(() => {
          chrome.action.setBadgeText({
            text: '',
            tabId: tabs[0].id
          });
        }, 5000);
      }
    });
  });
  
  // Listen for messages from popup and content scripts
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'orderScanResult') {
      // Handle scan results
      if (request.result.errorDetected || request.result.riskScore > 20) {
        chrome.action.setBadgeText({
          text: '!',
          tabId: sender.tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
          color: request.result.errorDetected ? '#d32f2f' : '#ff9800',
          tabId: sender.tab.id
        });
        
        // Store the current tab for notification purposes
        chrome.storage.local.set({
          'currentIssueTab': sender.tab.id
        });
        
        // Show notification for high-risk orders
        if (request.result.riskScore > 40) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'High Risk Order Detected',
            message: `Order #${request.result.orderId} has a risk score of ${request.result.riskScore}%`
          });
        }
      } else {
        chrome.action.setBadgeText({
          text: '',
          tabId: sender.tab.id
        });
      }
      
      sendResponse({received: true});
    }
    else if (request.action === 'updateMonitoringStatus') {
      // Update badge when monitoring status changes
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          if (request.isActive) {
            chrome.action.setBadgeText({
              text: 'ON',
              tabId: tabs[0].id
            });
            
            chrome.action.setBadgeBackgroundColor({
              color: '#4caf50',
              tabId: tabs[0].id
            });
            
            // Clear the "ON" badge after 3 seconds
            setTimeout(() => {
              chrome.action.setBadgeText({
                text: '',
                tabId: tabs[0].id
              });
            }, 3000);
          } else {
            chrome.action.setBadgeText({
              text: 'OFF',
              tabId: tabs[0].id
            });
            
            chrome.action.setBadgeBackgroundColor({
              color: '#9e9e9e',
              tabId: tabs[0].id
            });
            
            // Clear the "OFF" badge after 3 seconds
            setTimeout(() => {
              chrome.action.setBadgeText({
                text: '',
                tabId: tabs[0].id
              });
            }, 3000);
          }
        }
      });
      
      sendResponse({updated: true});
    }
    else if (request.action === 'settingsUpdated') {
      // Handle settings updates if needed
      sendResponse({updated: true});
    }
    
    // Keep messaging channel open for async responses
    return true;
  });
  
  // DEMO MODE functionality
  // This will trigger a demo notification when the extension icon is clicked
  chrome.action.onClicked.addListener((tab) => {
    // Note: This won't work with a popup defined, but keeping for reference
    // In popup mode, the popup.html is shown instead
    
    // Simulate finding a high-risk order
    chrome.action.setBadgeText({
      text: '!',
      tabId: tab.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#d32f2f',
      tabId: tab.id
    });
    
    // Show demo notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: 'High Risk Order Detected',
      message: 'Order #FL39475 has a risk score of 78%'
    });
    
    // Store the current tab for demo purposes
    chrome.storage.local.set({
      'currentIssueTab': tab.id
    });
  });
  
  // Handle notification clicks
  chrome.notifications.onClicked.addListener(function(notificationId) {
    // Focus on the tab where the issue was detected
    chrome.storage.local.get('currentIssueTab', function(data) {
      if (data.currentIssueTab) {
        chrome.tabs.update(data.currentIssueTab, {active: true});
      }
    });
  });