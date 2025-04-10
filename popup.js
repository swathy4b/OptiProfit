// Popup.js for OptiProfit extension

document.addEventListener('DOMContentLoaded', function() {
    // Get UI elements
    const statusElement = document.getElementById('status');
    const siteInfoElement = document.getElementById('siteInfo');
    const enableMonitoringCheckbox = document.getElementById('enableMonitoring');
    const manualScanButton = document.getElementById('manualScan');
    const platformSelect = document.getElementById('platform');
    const alertThresholdInput = document.getElementById('alertThreshold');
    const autoInterventionCheckbox = document.getElementById('autoIntervention');
    const saveSettingsButton = document.getElementById('saveSettings');
    const resetSettingsButton = document.getElementById('resetSettings');
  
    // Load current settings
    loadSettings();
  
    // Add event listeners
    enableMonitoringCheckbox.addEventListener('change', updateMonitoringStatus);
    manualScanButton.addEventListener('click', triggerManualScan);
    saveSettingsButton.addEventListener('click', saveSettings);
    resetSettingsButton.addEventListener('click', resetSettings);
  
    // Check current tab compatibility
    checkCurrentSite();
  
    // Functions
    function loadSettings() {
      chrome.storage.local.get('settings', function(data) {
        if (data.settings) {
          enableMonitoringCheckbox.checked = data.settings.isActive;
          platformSelect.value = data.settings.platform;
          alertThresholdInput.value = data.settings.alertThreshold;
          autoInterventionCheckbox.checked = data.settings.autoIntervention;
          
          // Update UI based on active status
          updateStatusUI(data.settings.isActive);
        }
      });
    }
  
    function updateStatusUI(isActive) {
      if (isActive) {
        statusElement.textContent = 'Active';
        statusElement.classList.remove('inactive');
        statusElement.classList.add('active');
      } else {
        statusElement.textContent = 'Inactive';
        statusElement.classList.remove('active');
        statusElement.classList.add('inactive');
      }
    }
  
    function updateMonitoringStatus() {
      const isActive = enableMonitoringCheckbox.checked;
      
      chrome.storage.local.get('settings', function(data) {
        const settings = data.settings || {};
        settings.isActive = isActive;
        
        chrome.storage.local.set({ settings: settings }, function() {
          updateStatusUI(isActive);
          
          // Notify background script of status change
          chrome.runtime.sendMessage({
            action: 'updateMonitoringStatus',
            isActive: isActive
          });
        });
      });
    }
  
    function triggerManualScan() {
      // Query for the active tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          // Send message to content script
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'manualScan'
          }, function(response) {
            // Handle possible error when content script is not available
            if (chrome.runtime.lastError) {
              siteInfoElement.innerHTML = '<p>Cannot scan this page. Make sure you are on a supported site.</p>';
            } else if (response && response.status === 'scanning') {
              manualScanButton.textContent = 'Scanning...';
              manualScanButton.disabled = true;
              
              // Re-enable after 2 seconds
              setTimeout(() => {
                manualScanButton.textContent = 'Scan Current Page';
                manualScanButton.disabled = false;
              }, 2000);
            }
          });
        }
      });
    }
  
    function saveSettings() {
      const settings = {
        isActive: enableMonitoringCheckbox.checked,
        platform: platformSelect.value,
        alertThreshold: parseInt(alertThresholdInput.value, 10),
        autoIntervention: autoInterventionCheckbox.checked
      };
      
      chrome.storage.local.set({ settings: settings }, function() {
        // Notify user of saved settings
        const saveBtn = document.getElementById('saveSettings');
        saveBtn.textContent = 'Settings Saved!';
        
        setTimeout(() => {
          saveBtn.textContent = 'Save Settings';
        }, 1500);
        
        // Notify background script of settings change
        chrome.runtime.sendMessage({
          action: 'settingsUpdated',
          settings: settings
        });
      });
    }
  
    function resetSettings() {
      const defaultSettings = {
        isActive: true,
        platform: 'shopify',
        alertThreshold: 20,
        autoIntervention: true
      };
      
      // Update UI
      enableMonitoringCheckbox.checked = defaultSettings.isActive;
      platformSelect.value = defaultSettings.platform;
      alertThresholdInput.value = defaultSettings.alertThreshold;
      autoInterventionCheckbox.checked = defaultSettings.autoIntervention;
      
      // Save to storage
      chrome.storage.local.set({ settings: defaultSettings }, function() {
        // Notify user
        const resetBtn = document.getElementById('resetSettings');
        resetBtn.textContent = 'Settings Reset!';
        
        setTimeout(() => {
          resetBtn.textContent = 'Reset Settings';
        }, 1500);
        
        updateStatusUI(defaultSettings.isActive);
        
        // Notify background script
        chrome.runtime.sendMessage({
          action: 'settingsUpdated',
          settings: defaultSettings
        });
      });
    }
  
    function checkCurrentSite() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          const url = tabs[0].url;
          
          // Check if current site is compatible
          let isSupportedSite = false;
          let siteName = '';
          
          if (url.includes('shopify.com')) {
            isSupportedSite = true;
            siteName = 'Shopify';
          } else if (url.includes('doordash.com')) {
            isSupportedSite = true;
            siteName = 'DoorDash';
          }
          
          if (isSupportedSite) {
            siteInfoElement.innerHTML = `
              <p><strong>${siteName}</strong> detected.</p>
              <p>OptiProfit is ready to monitor this page for order issues.</p>
            `;
            manualScanButton.disabled = false;
          } else {
            siteInfoElement.innerHTML = `
              <p>No compatible site detected.</p>
              <p>OptiProfit works with Shopify and DoorDash order pages.</p>
            `;
            manualScanButton.disabled = true;
          }
        }
      });
    }
  });