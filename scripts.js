document.addEventListener('DOMContentLoaded', function() {
    // Element selectors
    const fixItemBtn = document.getElementById('fixItemBtn');
    const overrideBtn = document.getElementById('overrideBtn');
    const skipItemBtn = document.getElementById('skipItemBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const errorAlert = document.querySelector('.error-alert');
    const errorAlertTitle = document.querySelector('.error-alert h3');
    const errorAlertDesc = document.querySelector('.error-alert p');
    
    // Dashboard elements
    const errorsCountElement = document.getElementById('errorsCount');
    const moneySavedElement = document.getElementById('moneySaved');
    const preventionRateElement = document.getElementById('preventionRate');
    
    // Initial data state
    let errorCount = 1249;
    let moneySaved = 12490;
    let preventionRate = 94.8;
    
    // Action button event handlers
    fixItemBtn.addEventListener('click', function() {
        // Update UI to show item is being fixed
        errorAlert.style.backgroundColor = '#d4edda';
        errorAlert.style.borderLeftColor = '#28a745';
        errorAlertTitle.style.color = '#28a745';
        errorAlertTitle.textContent = 'Fix in Progress: Order #38291';
        errorAlertDesc.textContent = 'Replacement with correct Red T-shirt has been initiated.';
        
        // Show success notification
        showNotification('Item fix requested. Sending replacement instructions to packing station.', 'success');
        
        // Update metrics - simulate saving money by fixing error
        updateMetrics(1, 15, 0.1);
    });
    
    overrideBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to override this error check? This will allow the order to proceed with the incorrect item.')) {
            // Update UI to show override status
            errorAlert.style.backgroundColor = '#fff3cd';
            errorAlert.style.borderLeftColor = '#ffc107';
            errorAlertTitle.style.color = '#856404';
            errorAlertTitle.textContent = 'Check Overridden: Order #38291';
            errorAlertDesc.textContent = 'This order will proceed with the Blue T-shirt. Override has been logged.';
            
            // Show warning notification
            showNotification('Error check has been overridden. This action has been logged.', 'warning');
        }
    });
    
    skipItemBtn.addEventListener('click', function() {
        // Update UI to show item is skipped
        errorAlert.style.backgroundColor = '#f8f9fa';
        errorAlert.style.borderLeftColor = '#6c757d';
        errorAlertTitle.style.color = '#6c757d';
        errorAlertTitle.textContent = 'Item Skipped: Order #38291';
        errorAlertDesc.textContent = 'This order has been flagged for supervisor review.';
        
        // Show info notification
        showNotification('Item will be temporarily skipped and flagged for review by a supervisor.', 'info');
    });
    
    cancelBtn.addEventListener('click', function() {
        if (confirm('Cancel this error review? You can access it later from the pending reviews section.')) {
            // Hide the error alert
            errorAlert.style.display = 'none';
            
            // Show info notification
            showNotification('Error review cancelled. You can access this alert again from the pending reviews dashboard.', 'info');
        }
    });
    
    // Function to update dashboard metrics
    function updateMetrics(errorsPreventedInc, moneySavedInc, preventionRateInc) {
        // Update values
        errorCount += errorsPreventedInc;
        moneySaved += moneySavedInc;
        preventionRate += preventionRateInc;
        
        // Keep prevention rate below 100%
        if (preventionRate > 99.9) preventionRate = 99.9;
        
        // Update display
        errorsCountElement.textContent = errorCount.toLocaleString();
        moneySavedElement.textContent = '$' + moneySaved.toLocaleString();
        preventionRateElement.textContent = preventionRate.toFixed(1) + '%';
        
        // Animate the changes
        animateValue(errorsCountElement);
        animateValue(moneySavedElement);
        animateValue(preventionRateElement);
    }
    
    // Function to animate value changes
    function animateValue(element) {
        element.classList.add('highlight-change');
        setTimeout(() => {
            element.classList.remove('highlight-change');
        }, 1500);
    }
    
    // Function to show notifications
    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification ' + type;
        notification.textContent = message;
        
        // Append to body
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
    
    // Add CSS for notifications
    const notificationStyles = document.createElement('style');
    notificationStyles.innerHTML = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            max-width: 300px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            transform: translateX(400px);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            z-index: 1000;
        }
        
        .notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .notification.success {
            background-color: #2ecc71;
        }
        
        .notification.warning {
            background-color: #f39c12;
        }
        
        .notification.info {
            background-color: #3498db;
        }
        
        .notification.error {
            background-color: #e74c3c;
        }
        
        .highlight-change {
            animation: highlight 1.5s ease;
        }
        
        @keyframes highlight {
            0% {
                background-color: rgba(255, 255, 0, 0.5);
            }
            100% {
                background-color: transparent;
            }
        }
    `;
    
    // Add the styles to the document
    document.head.appendChild(notificationStyles);
    
    // Initialize - you might load data from API here
    function initializeApp() {
        // Set initial values
        errorsCountElement.textContent = errorCount.toLocaleString();
        moneySavedElement.textContent = '$' + moneySaved.toLocaleString();
        preventionRateElement.textContent = preventionRate.toFixed(1) + '%';
        
        // Show initial error alert
        errorAlert.style.display = 'block';
    }
    
    // Start the application
    initializeApp();
});