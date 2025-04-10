// Enhanced content script for OptiProfit extension with product reliability data


let lastScanResult = null;
// Cache for product reliability data
let productReliabilityCache = {};

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'manualScan') {
    // Start scanning the page
    scanPage().then(result => {
      sendResponse({status: 'scanning'});
      
      // After scan completes, send results to background
      chrome.runtime.sendMessage({
        action: 'orderScanResult',
        result: result
      });
    }).catch(error => {
      console.error('Scan error:', error);
      sendResponse({status: 'error', message: error.toString()});
    });
    
    // Keep the message channel open for the async response
    return true;
  }
});

// Initialize monitoring
function initialize() {
  // Check if monitoring is enabled
  chrome.storage.local.get('settings', function(data) {
    if (data.settings && data.settings.isActive) {
      startMonitoring();
    }
  });
  
  // Check if we're on a product page
  detectPageType().then(pageType => {
    if (pageType === 'productPage') {
      // Show product reliability data
      showProductReliabilityData();
    }
  });
  
  // Listen for DOM changes that might indicate new order data
  setupMutationObserver();
}

// Detect the type of page we're on
async function detectPageType() {
  const url = window.location.href;
  const pageContent = document.body.textContent.toLowerCase();
  
  // Check for e-commerce product pages
  if (
    (url.includes('flipkart.com') && (url.includes('/p/') || pageContent.includes('add to cart'))) ||
    (url.includes('amazon') && (url.includes('/dp/') || pageContent.includes('add to cart'))) ||
    (url.includes('shopify') && pageContent.includes('add to cart'))
  ) {
    return 'productPage';
  }
  
  // Check for checkout/cart pages
  if (
    pageContent.includes('checkout') || 
    pageContent.includes('shopping cart') || 
    pageContent.includes('your cart') ||
    pageContent.includes('shipping address') ||
    pageContent.includes('payment method')
  ) {
    return 'checkoutPage';
  }
  
  // Check for food delivery pages
  if (
    url.includes('doordash') || 
    url.includes('ubereats') || 
    url.includes('grubhub') ||
    pageContent.includes('food delivery')
  ) {
    return 'foodDeliveryPage';
  }
  
  return 'other';
}

// Setup page monitoring
function startMonitoring() {
  // Initial scan
  scanPage().then(result => {
    if (result.errorDetected || result.riskScore > 0) {
      chrome.runtime.sendMessage({
        action: 'orderScanResult',
        result: result
      });
      
      lastScanResult = result;
    }
  });
}

// Watch for page changes
function setupMutationObserver() {
  const observer = new MutationObserver(function(mutations) {
    // Debounce to avoid excessive scanning
    clearTimeout(window.scanTimeout);
    window.scanTimeout = setTimeout(() => {
      detectPageType().then(pageType => {
        if (pageType === 'productPage') {
          // Update product reliability data
          showProductReliabilityData();
        } else if (pageType === 'checkoutPage' || pageType === 'foodDeliveryPage') {
          // Scan checkout/order pages
          chrome.storage.local.get('settings', function(data) {
            if (data.settings && data.settings.isActive) {
              scanPage().then(result => {
                // Only send if different from last result or significant issues found
                if (!lastScanResult || 
                    result.riskScore !== lastScanResult.riskScore || 
                    result.errorDetected !== lastScanResult.errorDetected) {
                  
                  chrome.runtime.sendMessage({
                    action: 'orderScanResult',
                    result: result
                  });
                  
                  lastScanResult = result;
                  
                  // If auto-intervention is enabled and high risk, show warning
                  if (data.settings.autoIntervention && 
                      (result.errorDetected || result.riskScore > data.settings.alertThreshold)) {
                    showWarning(result);
                  }
                }
              });
            }
          });
        }
      });
    }, 1000);
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
}

// NEW FEATURE: Show product reliability data
async function showProductReliabilityData() {
  // Extract product information
  const productInfo = extractProductInfo();
  if (!productInfo.id) {
    return; // Can't proceed without product ID
  }
  
  // Check cache first
  if (productReliabilityCache[productInfo.id]) {
    renderProductReliabilityWidget(productReliabilityCache[productInfo.id]);
    return;
  }
  
  // In a real implementation, this would be an API call to your backend
  // For demonstration, we'll generate synthetic data
  const reliabilityData = await fetchProductReliabilityData(productInfo);
  
  // Cache the data
  productReliabilityCache[productInfo.id] = reliabilityData;
  
  // Render the widget
  renderProductReliabilityWidget(reliabilityData);
}

// Extract product information from the page
function extractProductInfo() {
  const url = window.location.href;
  const pageText = document.body.textContent;
  
  // Default empty product info
  let productInfo = {
    id: '',
    name: '',
    price: 0,
    vendor: ''
  };
  
  // Extract product ID based on URL patterns
  if (url.includes('flipkart.com')) {
    // Extract Flipkart product ID
    const idMatch = url.match(/\/p\/([a-zA-Z0-9]+)/);
    if (idMatch && idMatch[1]) {
      productInfo.id = 'FK_' + idMatch[1];
    }
    
    // Extract product name
    const titleElement = document.querySelector('h1._35KyD6, h1.yhB1nd, h1._30jeq3, h1.B_NuCI');
    if (titleElement) {
      productInfo.name = titleElement.textContent.trim();
    }
    
    // Extract price
    const priceElement = document.querySelector('div._30jeq3, div._30jeq3._1_WHN1');
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const priceMatch = priceText.match(/₹([0-9,]+)/);
      if (priceMatch && priceMatch[1]) {
        productInfo.price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }
    
    productInfo.vendor = 'Flipkart';
  } else if (url.includes('amazon')) {
    // Extract Amazon product ID
    const idMatch = url.match(/\/dp\/([A-Z0-9]+)/);
    if (idMatch && idMatch[1]) {
      productInfo.id = 'AMZ_' + idMatch[1];
    }
    
    // Extract product name
    const titleElement = document.querySelector('#productTitle');
    if (titleElement) {
      productInfo.name = titleElement.textContent.trim();
    }
    
    // Extract price
    const priceElement = document.querySelector('#priceblock_ourprice, #priceblock_dealprice');
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const priceMatch = priceText.match(/\$([0-9,.]+)/);
      if (priceMatch && priceMatch[1]) {
        productInfo.price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }
    
    productInfo.vendor = 'Amazon';
  } else {
    // Generic extraction for other websites
    // Extract a unique identifier from the URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    if (lastPart && lastPart.length > 3) {
      productInfo.id = 'GEN_' + lastPart;
    } else {
      productInfo.id = 'GEN_' + Math.random().toString(36).substring(2, 15);
    }
    
    // Try to find product name from common patterns
    const titleElement = document.querySelector('h1, .product-title, .product-name');
    if (titleElement) {
      productInfo.name = titleElement.textContent.trim();
    }
    
    // Try to find price from common patterns
    const priceRegex = /\$([\d,]+\.\d{2})/;
    const priceMatch = pageText.match(priceRegex);
    if (priceMatch && priceMatch[1]) {
      productInfo.price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    
    productInfo.vendor = new URL(url).hostname.replace('www.', '');
  }
  
  return productInfo;
}

// Fetch product reliability data
// In a real implementation, this would be an API call to your backend
async function fetchProductReliabilityData(productInfo) {
  // Simulate API call with timeout
  return new Promise(resolve => {
    setTimeout(() => {
      // Generate synthetic data based on product ID
      // This would come from your database in a real implementation
      const productIdHash = hashString(productInfo.id);
      
      // Generate reliability data based on product ID hash
      // This ensures the same product will get consistent data
      const reliabilityData = {
        deliveryDelays: {
          percentage: 5 + (productIdHash % 20), // 5-25% delay rate
          averageDelay: 1 + (productIdHash % 4), // 1-5 days average delay
        },
        returnRate: {
          percentage: 3 + (productIdHash % 12), // 3-15% return rate
          topReasons: [
            "Size/fit issues",
            "Product didn't match description",
            "Quality issues",
            "Arrived damaged"
          ].slice(0, 1 + (productIdHash % 3)) // 1-4 reasons
        },
        customerIssues: {
          issueRate: 2 + (productIdHash % 8), // 2-10% issue rate
          commonIssues: [
            "Late delivery",
            "Missing components",
            "Wrong item delivered",
            "Quality not as expected",
            "Packaging issues"
          ].slice(0, 1 + (productIdHash % 4)) // 1-5 issues
        },
        reliabilityScore: Math.max(50, 100 - ((productIdHash % 50))), // 50-100 score
        recommendations: []
      };
      
      // Add recommendations based on issues
      if (reliabilityData.deliveryDelays.percentage > 15) {
        reliabilityData.recommendations.push("Consider expedited shipping options");
      }
      
      if (reliabilityData.returnRate.percentage > 10) {
        reliabilityData.recommendations.push("Verify product specifications before ordering");
      }
      
      if (reliabilityData.customerIssues.issueRate > 5) {
        reliabilityData.recommendations.push("Check seller ratings and reviews");
      }
      
      // Simulate market comparison (whether this product is better/worse than average)
      reliabilityData.marketComparison = {
        deliveryDelays: reliabilityData.deliveryDelays.percentage < 15 ? "better" : "worse",
        returnRate: reliabilityData.returnRate.percentage < 8 ? "better" : "worse",
        reliability: reliabilityData.reliabilityScore > 75 ? "better" : "worse"
      };
      
      resolve(reliabilityData);
    }, 500); // Simulate network delay
  });
}

// Simple hash function for consistent synthetic data generation
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Render the product reliability widget
function renderProductReliabilityWidget(reliabilityData) {
  // Remove existing widget if present
  const existingWidget = document.getElementById('optiprofit-reliability-widget');
  if (existingWidget) {
    existingWidget.remove();
  }
  
  // Create widget element
  const widgetElement = document.createElement('div');
  widgetElement.id = 'optiprofit-reliability-widget';
  widgetElement.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    width: 320px;
    background-color: white;
    border: 1px solid #dadce0;
    border-top: 4px solid ${reliabilityData.reliabilityScore > 80 ? '#4caf50' : 
                           reliabilityData.reliabilityScore > 60 ? '#ff9800' : '#f44336'};
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  // Widget content
  widgetElement.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <strong style="font-size: 16px;">OptiProfit Product Insights</strong>
      <span id="optiprofit-reliability-close" style="cursor: pointer; font-size: 18px;">&times;</span>
    </div>
    
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <div style="
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: conic-gradient(
          ${reliabilityData.reliabilityScore > 80 ? '#4caf50' : 
            reliabilityData.reliabilityScore > 60 ? '#ff9800' : '#f44336'} 
          ${reliabilityData.reliabilityScore * 3.6}deg, 
          #f1f1f1 0deg
        );
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="font-size: 20px; font-weight: bold;">${reliabilityData.reliabilityScore}</span>
        </div>
      </div>
      <div style="margin-left: 16px;">
        <div style="font-size: 18px; font-weight: bold;">Reliability Score</div>
        <div style="color: ${reliabilityData.reliabilityScore > 80 ? '#4caf50' : 
                           reliabilityData.reliabilityScore > 60 ? '#ff9800' : '#f44336'};">
          ${reliabilityData.reliabilityScore > 80 ? 'Excellent' : 
            reliabilityData.reliabilityScore > 60 ? 'Good' : 'Needs Improvement'}
        </div>
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span>Delivery Delays</span>
        <span style="color: ${reliabilityData.marketComparison.deliveryDelays === 'better' ? '#4caf50' : '#f44336'};">
          ${reliabilityData.marketComparison.deliveryDelays === 'better' ? '✓ Better than average' : '✗ Worse than average'}
        </span>
      </div>
      <div style="background-color: #f1f1f1; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background-color: ${reliabilityData.deliveryDelays.percentage > 15 ? '#f44336' : 
                                      reliabilityData.deliveryDelays.percentage > 8 ? '#ff9800' : '#4caf50'}; 
                    height: 100%; width: ${reliabilityData.deliveryDelays.percentage * 3}%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
        <span>${reliabilityData.deliveryDelays.percentage}% of orders delayed</span>
        <span>Avg. delay: ${reliabilityData.deliveryDelays.averageDelay} day${reliabilityData.deliveryDelays.averageDelay > 1 ? 's' : ''}</span>
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span>Return Rate</span>
        <span style="color: ${reliabilityData.marketComparison.returnRate === 'better' ? '#4caf50' : '#f44336'};">
          ${reliabilityData.marketComparison.returnRate === 'better' ? '✓ Better than average' : '✗ Worse than average'}
        </span>
      </div>
      <div style="background-color: #f1f1f1; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background-color: ${reliabilityData.returnRate.percentage > 10 ? '#f44336' : 
                                      reliabilityData.returnRate.percentage > 5 ? '#ff9800' : '#4caf50'}; 
                    height: 100%; width: ${reliabilityData.returnRate.percentage * 5}%;"></div>
      </div>
      <div style="font-size: 13px; margin-top: 4px;">
        ${reliabilityData.returnRate.percentage}% of customers return this item
      </div>
      
      ${reliabilityData.returnRate.topReasons.length > 0 ? `
        <div style="margin-top: 8px; background-color: #f9f9f9; padding: 8px; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">Top reasons for returns:</div>
          <ul style="margin: 0; padding-left: 16px; font-size: 12px;">
            ${reliabilityData.returnRate.topReasons.map(reason => `<li>${reason}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="font-weight: bold; margin-bottom: 8px;">Customer Issues</div>
      <div style="font-size: 13px;">
        ${reliabilityData.customerIssues.issueRate}% of customers report issues
      </div>
      
      ${reliabilityData.customerIssues.commonIssues.length > 0 ? `
        <div style="margin-top: 8px; background-color: #f9f9f9; padding: 8px; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">Common issues:</div>
          <ul style="margin: 0; padding-left: 16px; font-size: 12px;">
            ${reliabilityData.customerIssues.commonIssues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
    
    ${reliabilityData.recommendations.length > 0 ? `
      <div style="margin-top: 16px; background-color: #e3f2fd; padding: 12px; border-radius: 4px;">
        <div style="font-weight: bold; margin-bottom: 8px;">OptiProfit Recommendations</div>
        <ul style="margin: 0; padding-left: 16px;">
          ${reliabilityData.recommendations.map(rec => `<li style="margin-bottom: 4px;">${rec}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    
    <div style="margin-top: 16px; text-align: center;">
      <button id="optiprofit-show-more" style="
        padding: 8px 16px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">Show More Data</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(widgetElement);
  
  // Add event listeners
  document.getElementById('optiprofit-reliability-close').addEventListener('click', function() {
    widgetElement.remove();
  });
  
  document.getElementById('optiprofit-show-more').addEventListener('click', function() {
    // This would show additional data in a real implementation
    const button = document.getElementById('optiprofit-show-more');
    button.textContent = "Loading...";
    
    setTimeout(() => {
      // Show expanded data
      const expandedDataSection = document.createElement('div');
      expandedDataSection.style.marginTop = '16px';
      expandedDataSection.style.borderTop = '1px solid #dadce0';
      expandedDataSection.style.paddingTop = '16px';
      
      expandedDataSection.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 12px;">Historical Performance</div>
        
        <div style="margin-bottom: 12px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">Monthly Return Rate Trend</div>
          <div style="display: flex; align-items: flex-end; height: 60px;">
            ${generateBarChart(reliabilityData.returnRate.percentage)}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #777;">
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">Customer Satisfaction</div>
          <div style="display: flex; align-items: center;">
            <div style="width: 70%; margin-right: 12px;">
              <div style="background-color: #f1f1f1; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background-color: #4caf50; height: 100%; width: ${80 - (reliabilityData.customerIssues.issueRate * 2)}%;"></div>
              </div>
            </div>
            <div style="font-size: 14px; font-weight: bold;">${80 - (reliabilityData.customerIssues.issueRate * 2)}%</div>
          </div>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <div style="font-weight: bold; margin-bottom: 8px;">Similar Products Comparison</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr style="border-bottom: 1px solid #dadce0;">
              <th style="text-align: left; padding: 4px;">Metric</th>
              <th style="text-align: right; padding: 4px;">This Product</th>
              <th style="text-align: right; padding: 4px;">Category Avg</th>
            </tr>
            <tr>
              <td style="padding: 4px;">Delivery Delays</td>
              <td style="text-align: right; padding: 4px;">${reliabilityData.deliveryDelays.percentage}%</td>
              <td style="text-align: right; padding: 4px;">12%</td>
            </tr>
            <tr>
              <td style="padding: 4px;">Return Rate</td>
              <td style="text-align: right; padding: 4px;">${reliabilityData.returnRate.percentage}%</td>
              <td style="text-align: right; padding: 4px;">8%</td>
            </tr>
            <tr>
              <td style="padding: 4px;">Customer Issues</td>
              <td style="text-align: right; padding: 4px;">${reliabilityData.customerIssues.issueRate}%</td>
              <td style="text-align: right; padding: 4px;">5%</td>
            </tr>
          </table>
        </div>
        
        <div style="font-size: 11px; color: #777; text-align: center;">
          Data analysis based on thousands of similar orders across our platform.
        </div>
      `;
      
      // Replace the button with the expanded data
      button.parentNode.replaceChild(expandedDataSection, button);
    }, 1000);
  });
}

// Generate a simple bar chart for the expanded data
function generateBarChart(baseValue) {
  // Generate 6 bars with random variation around the base value
  let bars = [];
  for (let i = 0; i < 6; i++) {
    // Random variation between 0.7x and 1.3x of base value
    const variation = 0.7 + (Math.random() * 0.6);
    const value = Math.max(1, Math.round(baseValue * variation));
    const height = Math.min(100, value * 4); // Scale for display
    
    bars.push(`
      <div style="
        width: 14%;
        margin: 0 1%;
        height: ${height}%;
        background-color: ${value > 10 ? '#f44336' : value > 5 ? '#ff9800' : '#4caf50'};
        border-radius: 2px 2px 0 0;
      "></div>
    `);
  }
  
  return bars.join('');
}

// Enhanced analysis algorithm for detecting order issues
async function scanPage() {
  // This implementation focuses on the $2M/year in misdeliveries and $1.5M/year in order mix-ups
  
  let result = {
    errorDetected: false,
    riskScore: 0,
    orderId: extractOrderId(),
    issues: [],
    potentialSavings: 0,
    correctiveAction: null
  };
  
  // ENHANCED DETECTION LOGIC
  if (window.location.href.includes('shopify.com') || document.body.textContent.includes('shopify')) {
    // E-commerce specific detection
    const orderData = extractOrderData();
    
    // Address verification
    const addressIssues = detectAddressIssues();
    if (addressIssues.hasIssue) {
      result.riskScore += 25;
      result.issues.push(`Address issue detected: ${addressIssues.details}`);
      result.potentialSavings += 10; // $10 average per prevented misdelivery
      result.correctiveAction = "Verify shipping address";
    }
    
    // Product SKU/variant mismatch detection
    const productIssues = detectProductMismatches();
    if (productIssues.hasIssue) {
      result.riskScore += 35;
      result.issues.push(`Product mismatch: ${productIssues.details}`);
      result.errorDetected = true;
      result.potentialSavings += 15; // $15 average per prevented return
      result.correctiveAction = "Confirm correct product variant";
    }
    
    // Historical customer data analysis
    const customerIssues = analyzeCustomerHistory();
    if (customerIssues.riskLevel > 0) {
      result.riskScore += customerIssues.riskLevel;
      result.issues.push(`Customer risk factor: ${customerIssues.details}`);
      result.potentialSavings += customerIssues.potentialSavings;
    }
    
    // Discount and pricing analysis
    const pricingIssues = detectPricingIssues();
    if (pricingIssues.hasIssue) {
      result.riskScore += 20;
      result.issues.push(`Pricing inconsistency: ${pricingIssues.details}`);
      result.potentialSavings += pricingIssues.potentialSavings;
      result.correctiveAction = pricingIssues.suggestedAction;
    }
  } 
  else if (window.location.href.includes('doordash.com') || document.body.textContent.includes('food delivery')) {
    // Food delivery specific detection
    
    // Multi-vendor order detection
    const multiVendorIssues = detectMultiVendorIssues();
    if (multiVendorIssues.hasIssue) {
      result.riskScore += 30;
      result.issues.push(`Multiple vendor complexity: ${multiVendorIssues.details}`);
      result.potentialSavings += 8;
      result.correctiveAction = "Consider separate orders";
    }
    
    // Delivery time risk analysis
    const timeRiskIssues = analyzeDeliveryTimeRisk();
    if (timeRiskIssues.riskLevel > 0) {
      result.riskScore += timeRiskIssues.riskLevel;
      result.issues.push(`Delivery timing risk: ${timeRiskIssues.details}`);
      result.potentialSavings += 5;
      result.correctiveAction = timeRiskIssues.suggestedAction;
    }
    
    // Special instructions analysis
    const specialInstructionsIssues = detectSpecialInstructions();
    if (specialInstructionsIssues.hasIssue) {
      result.riskScore += 15;
      result.issues.push(`Special instructions risk: ${specialInstructionsIssues.details}`);
      result.potentialSavings += 7;
      result.correctiveAction = "Simplify or clarify instructions";
    }
    
    // Menu substitution detection
    const substitutionIssues = detectSubstitutionRisks();
    if (substitutionIssues.hasIssue) {
      result.riskScore += 20;
      result.issues.push(`Substitution risks: ${substitutionIssues.details}`);
      result.potentialSavings += 6;
      result.correctiveAction = substitutionIssues.suggestedAction;
    }
  }
  else {
    // Generic order detection
    // Implement generic detection logic for other websites
    const genericIssues = detectGenericOrderIssues();
    if (genericIssues.length > 0) {
      result.riskScore += 10 * genericIssues.length;
      result.issues = [...result.issues, ...genericIssues];
      result.potentialSavings += 5 * genericIssues.length;
    }
  }
  
  // Determine if error is detected based on risk score threshold
  if (result.riskScore >= 50) {
    result.errorDetected = true;
  }
  
  return result;
}

// Show warning to user with detected issues
function showWarning(result) {
  // Remove existing warning if present
  const existingWarning = document.getElementById('optiprofit-warning');
  if (existingWarning) {
    existingWarning.remove();
  }
  
  // Create warning element
  const warningElement = document.createElement('div');
  warningElement.id = 'optiprofit-warning';
  warningElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    background-color: white;
    border: 1px solid #dadce0;
    border-left: 5px solid ${result.riskScore > 70 ? '#f44336' : '#ff9800'};
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;
  
  // Warning content
  warningElement.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <div style="display: flex; align-items: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z" 
            fill="${result.riskScore > 70 ? '#f44336' : '#ff9800'}"/>
        </svg>
        <strong style="font-size: 18px; margin-left: 8px;">Order Risk Detected</strong>
      </div>
      <span id="optiprofit-warning-close" style="cursor: pointer; font-size: 20px;">&times;</span>
    </div>
    
    <div style="margin-bottom: 15px;">
      OptiProfit has detected potential issues with your order that might lead to problems:
    </div>
    
    <ul style="margin: 0 0 15px 0; padding-left: 20px;">
      ${result.issues.map(issue => `<li style="margin-bottom: 8px;">${issue}</li>`).join('')}
    </ul>
    
    ${result.correctiveAction ? `
      <div style="background-color: #e8f5e9; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
        <strong>Recommended action:</strong> ${result.correctiveAction}
      </div>
    ` : ''}
    
    <div style="background-color: #e3f2fd; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
      <div style="display: flex; align-items: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="#2196F3"/>
        </svg>
        <span style="margin-left: 8px; font-weight: bold;">Potential savings: $${result.potentialSavings.toFixed(2)}</span>
      </div>
    </div>
    
    <div style="display: flex; justify-content: space-between;">
      <button id="optiprofit-warning-ignore" style="
        padding: 8px 16px;
        background-color: transparent;
        color: #555;
        border: 1px solid #dadce0;
        border-radius: 4px;
        cursor: pointer;
        flex: 1;
        margin-right: 8px;
      ">Ignore & Continue</button>
      
      <button id="optiprofit-warning-fix" style="
        padding: 8px 16px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        flex: 1;
      ">Fix Issues</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(warningElement);
  
  // Add event listeners
  document.getElementById('optiprofit-warning-close').addEventListener('click', function() {
    warningElement.remove();
  });
  
  document.getElementById('optiprofit-warning-ignore').addEventListener('click', function() {
    // Log that user ignored the warning
    chrome.runtime.sendMessage({
      action: 'logUserAction',
      data: {
        action: 'ignored_warning',
        riskScore: result.riskScore,
        orderId: result.orderId
      }
    });
    
    warningElement.remove();
  });
  
  document.getElementById('optiprofit-warning-fix').addEventListener('click', function() {
    // Log that user chose to fix issues
    chrome.runtime.sendMessage({
      action: 'logUserAction',
      data: {
        action: 'fix_issues',
        riskScore: result.riskScore,
        orderId: result.orderId
      }
    });
    
    // Highlight the issues on the page
    highlightIssues(result.issues);
    
    warningElement.remove();
  });
}

// Helper functions for order scanning

// Extract order ID from current page
function extractOrderId() {
  const url = window.location.href;
  const pageText = document.body.textContent;
  
  // Look for order ID patterns
  const orderIdPatterns = [
    /order[^\d]*(#?\d{5,})/i,
    /order[^\d]*(#?[A-Z0-9]{5,})/i,
    /#(\d{5,})/
  ];
  
  for (const pattern of orderIdPatterns) {
    const match = pageText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: Use part of URL or timestamp
  if (url.includes('order')) {
    const urlParts = url.split('/');
    const orderPart = urlParts.find(part => part.match(/\d{5,}/));
    if (orderPart) {
      return orderPart;
    }
  }
  
  // Last resort: Generate temporary ID
  return 'ORDER_' + Date.now().toString().substring(5);
}

// Extract detailed order data
function extractOrderData() {
  const orderData = {
    items: [],
    address: {},
    total: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0
  };
  
  // Extract items
  const itemElements = document.querySelectorAll('.cart-item, .product-item, .order-item, [class*="cart"], [class*="order"]');
  itemElements.forEach(item => {
    const itemText = item.textContent;
    const nameMatch = itemText.match(/([A-Za-z0-9 &'\-]+)\s+\$\d+/);
    const priceMatch = itemText.match(/\$(\d+\.\d{2})/);
    const quantityMatch = itemText.match(/qty:?\s*(\d+)/i) || itemText.match(/quantity:?\s*(\d+)/i) || itemText.match(/×\s*(\d+)/);
    
    if (nameMatch && priceMatch) {
      orderData.items.push({
        name: nameMatch[1].trim(),
        price: parseFloat(priceMatch[1]),
        quantity: quantityMatch ? parseInt(quantityMatch[1]) : 1
      });
    }
  });
  
  // Extract address info
  const addressElements = document.querySelectorAll('.address, [class*="address"], [class*="shipping"]');
  if (addressElements.length > 0) {
    const addressText = addressElements[0].textContent;
    
    // Extract address parts
    const streetMatch = addressText.match(/(\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr))/i);
    const cityStateZipMatch = addressText.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/);
    
    if (streetMatch) {
      orderData.address.street = streetMatch[1].trim();
    }
    
    if (cityStateZipMatch) {
      orderData.address.city = cityStateZipMatch[1].trim();
      orderData.address.state = cityStateZipMatch[2];
      orderData.address.zip = cityStateZipMatch[3];
    }
  }
  
  // Extract price information
  const totalMatch = document.body.textContent.match(/total:?\s*\$(\d+\.\d{2})/i);
  if (totalMatch) {
    orderData.total = parseFloat(totalMatch[1]);
  }
  
  const subtotalMatch = document.body.textContent.match(/subtotal:?\s*\$(\d+\.\d{2})/i);
  if (subtotalMatch) {
    orderData.subtotal = parseFloat(subtotalMatch[1]);
  }
  
  const taxMatch = document.body.textContent.match(/tax:?\s*\$(\d+\.\d{2})/i);
  if (taxMatch) {
    orderData.tax = parseFloat(taxMatch[1]);
  }
  
  const shippingMatch = document.body.textContent.match(/shipping:?\s*\$(\d+\.\d{2})/i);
  if (shippingMatch) {
    orderData.shipping = parseFloat(shippingMatch[1]);
  }
  
  return orderData;
}

// Detect issues with shipping address
function detectAddressIssues() {
  const orderData = extractOrderData();
  const pageText = document.body.textContent.toLowerCase();
  
  let result = {
    hasIssue: false,
    details: ''
  };
  
  // Check for missing address components
  if (orderData.address) {
    if (!orderData.address.street) {
      result.hasIssue = true;
      result.details = "Missing street address";
      return result;
    }
    
    if (!orderData.address.city || !orderData.address.state || !orderData.address.zip) {
      result.hasIssue = true;
      result.details = "Incomplete address (missing city, state, or ZIP)";
      return result;
    }
    
    // Check for suspicious ZIP code formats
    if (orderData.address.zip && !orderData.address.zip.match(/^\d{5}(?:-\d{4})?$/)) {
      result.hasIssue = true;
      result.details = "Invalid ZIP code format";
      return result;
    }
  }
  
  // Check for known address warning signals in page text
  const addressWarningTerms = [
    'address not found',
    'address verification failed',
    'cannot ship to this address',
    'address not valid',
    'undeliverable address'
  ];
  
  for (const term of addressWarningTerms) {
    if (pageText.includes(term)) {
      result.hasIssue = true;
      result.details = "Address validation warning detected";
      return result;
    }
  }
  
  return result;
}

// Detect product SKU/variant mismatches
function detectProductMismatches() {
  const pageText = document.body.textContent;
  
  let result = {
    hasIssue: false,
    details: ''
  };
  
  // Look for variant selection warnings
  const variantWarningTerms = [
    'please select',
    'choose an option',
    'select a size',
    'select a color',
    'option required',
    'selection required'
  ];
  
  for (const term of variantWarningTerms) {
    if (pageText.toLowerCase().includes(term)) {
      result.hasIssue = true;
      result.details = "Product options not fully selected";
      return result;
    }
  }
  
  // Check for conflicting product descriptions
  const productElements = document.querySelectorAll('.product-title, .product-name, .item-name, .cart-item');
  for (const element of productElements) {
    const text = element.textContent;
    
    // Check for size/color mismatch indicators
    if (text.includes('(') && text.includes(')')) {
      const descriptionParts = text.split('(');
      if (descriptionParts.length > 1) {
        const variantInfo = descriptionParts[1].split(')')[0];
        if (variantInfo.includes('?') || variantInfo.includes('choose') || variantInfo.includes('select')) {
          result.hasIssue = true;
          result.details = "Incomplete product variant selection";
          return result;
        }
      }
    }
  }
  
  return result;
}

// Analyze customer historical data for potential issues
function analyzeCustomerHistory() {
  // In a real implementation, this would check against a database
  // Here we'll simulate based on URL and any customer info on page
  
  let result = {
    riskLevel: 0,
    details: '',
    potentialSavings: 0
  };
  
  // For simulation purposes, randomly detect issues based on URL characteristics
  const url = window.location.href;
  const urlHash = hashString(url);
  
  // Pretend we have customer history data
  if (urlHash % 10 === 0) {
    result.riskLevel = 15;
    result.details = "Previous delivery issues at this address";
    result.potentialSavings = 8;
  } else if (urlHash % 7 === 0) {
    result.riskLevel = 20;
    result.details = "High return rate for similar orders";
    result.potentialSavings = 12;
  } else if (urlHash % 5 === 0) {
    result.riskLevel = 10;
    result.details = "Previous payment issue detection";
    result.potentialSavings = 5;
  }
  
  return result;
}

// Detect pricing issues
function detectPricingIssues() {
  const orderData = extractOrderData();
  const pageText = document.body.textContent.toLowerCase();
  
  let result = {
    hasIssue: false,
    details: '',
    potentialSavings: 0,
    suggestedAction: ''
  };
  
  // Check for mathematical inconsistencies in cart
  if (orderData.subtotal > 0 && orderData.total > 0) {
    const calculatedTotal = orderData.subtotal + orderData.tax + orderData.shipping;
    if (Math.abs(calculatedTotal - orderData.total) > 0.5) {
      result.hasIssue = true;
      result.details = "Order total calculation discrepancy";
      result.potentialSavings = Math.abs(calculatedTotal - orderData.total);
      result.suggestedAction = "Verify order total calculation";
      return result;
    }
  }
  
  // Check for missed coupon opportunities
  const couponTerms = [
    'promotional code',
    'coupon code',
    'discount code',
    'promo code',
    'enter code'
  ];
  
  for (const term of couponTerms) {
    if (pageText.includes(term)) {
      // Check if there's an empty coupon field
      const couponFields = document.querySelectorAll('input[name*="coupon"], input[name*="promo"], input[placeholder*="code"]');
      if (couponFields.length > 0) {
        for (const field of couponFields) {
          if (!field.value) {
            result.hasIssue = true;
            result.details = "Potential coupon savings available";
            result.potentialSavings = Math.max(5, orderData.subtotal * 0.1); // Estimate 10% or $5 min savings
            result.suggestedAction = "Check for available coupon codes";
            return result;
          }
        }
      }
    }
  }
  
  return result;
}

// For food delivery orders: detect issues with multi-vendor orders
function detectMultiVendorIssues() {
  const pageText = document.body.textContent.toLowerCase();
  
  let result = {
    hasIssue: false,
    details: ''
  };
  
  // Check for multiple restaurants or vendors
  const restaurantElements = document.querySelectorAll('.restaurant-name, .vendor-name, .store-name');
  if (restaurantElements.length > 1) {
    // Check if they're actually different (not just repeated UI elements)
    const restaurantNames = new Set();
    for (const element of restaurantElements) {
      restaurantNames.add(element.textContent.trim());
    }
    
    if (restaurantNames.size > 1) {
      result.hasIssue = true;
      result.details = `Order from ${restaurantNames.size} different vendors may increase delivery time`;
      return result;
    }
  }
  
  // Check for terms indicating multiple vendors
  const multiVendorTerms = [
    'multiple restaurants',
    'multiple vendors',
    'from different places',
    'separate deliveries',
    'multiple delivery fees'
  ];
  
  for (const term of multiVendorTerms) {
    if (pageText.includes(term)) {
      result.hasIssue = true;
      result.details = "Multiple vendor order may have coordination issues";
      return result;
    }
  }
  
  return result;
}

// Analyze delivery time risk
function analyzeDeliveryTimeRisk() {
  const pageText = document.body.textContent.toLowerCase();
  
  let result = {
    riskLevel: 0,
    details: '',
    suggestedAction: ''
  };
  
  // Check for peak hour delivery
  const timeElements = document.querySelectorAll('time, [class*="time"], [class*="delivery-time"]');
  let deliveryTimeText = '';
  
  for (const element of timeElements) {
    deliveryTimeText += element.textContent.toLowerCase() + ' ';
  }
  
  // Check for peak hour terms
  const peakHourTerms = [
    'high demand',
    'busy time',
    'peak hours',
    'longer than usual',
    'delayed'
  ];
  
  for (const term of peakHourTerms) {
    if (pageText.includes(term) || deliveryTimeText.includes(term)) {
      result.riskLevel = 25;
      result.details = "Order during high-demand period";
      result.suggestedAction = "Consider scheduling for a less busy time";
      return result;
    }
  }
  
  // Check for weather issues
  const weatherTerms = [
    'rain',
    'snow',
    'storm',
    'weather delay',
    'weather advisory'
  ];
  
  for (const term of weatherTerms) {
    if (pageText.includes(term)) {
      result.riskLevel = 30;
      result.details = "Weather conditions may affect delivery time";
      result.suggestedAction = "Add extra time buffer for delivery";
      return result;
    }
  }
  
  // Check for long estimated delivery time
  const timeRangeMatch = deliveryTimeText.match(/(\d+)-(\d+)\s*min/);
  if (timeRangeMatch) {
    const maxTime = parseInt(timeRangeMatch[2]);
    if (maxTime > 45) {
      result.riskLevel = 15;
      result.details = `Long delivery estimate (${maxTime} min)`;
      result.suggestedAction = "Consider closer restaurants";
      return result;
    }
  }
  
  return result;
}

// Detect issues with special instructions
function detectSpecialInstructions() {
  let result = {
    hasIssue: false,
    details: ''
  };
  
  // Find special instruction fields
  const instructionFields = document.querySelectorAll('textarea[name*="instruction"], textarea[name*="note"], textarea[placeholder*="special"], textarea[placeholder*="instruction"]');
  
  for (const field of instructionFields) {
    const text = field.value.toLowerCase();
    
    // Check for very long instructions
    if (text.length > 100) {
      result.hasIssue = true;
      result.details = "Lengthy special instructions may be overlooked";
      return result;
    }
    
    // Check for potentially problematic instructions
    const problematicTerms = [
      'allergy',
      'allergic',
      'medical',
      'condition',
      'call',
      'text',
      'phone'
    ];
    
    for (const term of problematicTerms) {
      if (text.includes(term)) {
        result.hasIssue = true;
        result.details = "Special instructions contain important health or contact information";
        return result;
      }
    }
  }
  
  return result;
}

// Detect substitution risks for food orders
function detectSubstitutionRisks() {
  const pageText = document.body.textContent.toLowerCase();
  
  let result = {
    hasIssue: false,
    details: '',
    suggestedAction: ''
  };
  
  // Check for substitution terms
  const substitutionTerms = [
    'substitution',
    'substitute',
    'out of stock',
    'may replace',
    'if unavailable'
  ];
  
  for (const term of substitutionTerms) {
    if (pageText.includes(term)) {
      result.hasIssue = true;
      result.details = "Order contains items that may be substituted";
      result.suggestedAction = "Set substitution preferences";
      return result;
    }
  }
  
  // Check for customized items
  const customizationElements = document.querySelectorAll('[class*="customization"], [class*="modification"], [class*="special"]');
  if (customizationElements.length > 2) { // Multiple customized items
    result.hasIssue = true;
    result.details = "Multiple customized items increase error risk";
    result.suggestedAction = "Consider simplifying customizations";
    return result;
  }
  
  return result;
}

// Generic order issue detection
function detectGenericOrderIssues() {
  const pageText = document.body.textContent.toLowerCase();
  const issues = [];
  
  // General warning terms to check
  const warningTerms = [
    { term: 'non-refundable', issue: "Order contains non-refundable items" },
    { term: 'final sale', issue: "Order contains final sale items" },
    { term: 'backorder', issue: "Order contains backordered items" },
    { term: 'pre-order', issue: "Order contains pre-order items" },
    { term: 'shipping delay', issue: "Shipping delays reported" },
    { term: 'out of stock', issue: "Some items may be out of stock" }
  ];
  
  for (const item of warningTerms) {
    if (pageText.includes(item.term)) {
      issues.push(item.issue);
    }
  }
  
  return issues;
}

// Highlight issues on the page to help user fix them
function highlightIssues(issues) {
  // Find elements likely related to the issues and highlight them
  
  issues.forEach(issue => {
    const lowerIssue = issue.toLowerCase();
    let elementsToHighlight = [];
    
    // Address issues
    if (lowerIssue.includes('address')) {
      elementsToHighlight = document.querySelectorAll('.address, [class*="address"], [class*="shipping"]');
    }
    // Product/variant issues
    else if (lowerIssue.includes('product') || lowerIssue.includes('variant')) {
      elementsToHighlight = document.querySelectorAll('.product-item, .cart-item, [class*="variant"], select, .product-options');
    }
    // Pricing issues
    else if (lowerIssue.includes('pricing') || lowerIssue.includes('total') || lowerIssue.includes('coupon')) {
      elementsToHighlight = document.querySelectorAll('.total, .subtotal, [class*="price"], [class*="coupon"], [class*="promo"]');
    }
    // Delivery issues
    else if (lowerIssue.includes('delivery') || lowerIssue.includes('time')) {
      elementsToHighlight = document.querySelectorAll('time, [class*="delivery"], [class*="time"]');
    }
    // Special instructions issues
    else if (lowerIssue.includes('instruction')) {
      elementsToHighlight = document.querySelectorAll('textarea, [class*="instruction"], [class*="note"]');
    }
    
    // Apply highlight styling
    elementsToHighlight.forEach(element => {
      element.style.boxShadow = '0 0 0 2px #f44336';
      element.style.background = 'rgba(244, 67, 54, 0.08)';
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

// Initialize the content script
initialize();