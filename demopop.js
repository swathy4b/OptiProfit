// Function to show a demo popup with sample data
function showDemoPopup() {
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'optiprofit-demo-popup';
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: 'Segoe UI', Arial, sans-serif;
      z-index: 10000;
      overflow: hidden;
      border-top: 4px solid #2196F3;
    `;
    
    // Create popup content
    popup.innerHTML = `
      <div style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 16px; font-weight: bold;">OptiProfit Demo</div>
          <div id="optiprofit-demo-close" style="cursor: pointer; font-size: 20px;">&times;</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background: conic-gradient(
                #4caf50 270deg, 
                #f1f1f1 0deg
              );
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <div style="
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="font-size: 18px; font-weight: bold;">75</span>
              </div>
            </div>
            <div style="margin-left: 12px;">
              <div style="font-weight: bold; font-size: 16px;">Reliability Score</div>
              <div style="color: #4caf50;">Good</div>
            </div>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Issues Detected:</div>
            <ul style="margin: 0 0 0 16px; padding: 0;">
              <li style="margin-bottom: 6px;">Estimated delivery is during peak hours</li>
              <li style="margin-bottom: 6px;">High return rate for this product (12%)</li>
            </ul>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Recommendations:</div>
            <ul style="margin: 0 0 0 16px; padding: 0;">
              <li style="margin-bottom: 6px;">Consider expedited shipping</li>
              <li>Verify product specifications</li>
            </ul>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="optiprofit-demo-dismiss" style="
            flex: 1;
            padding: 8px 12px;
            background-color: #f1f1f1;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            color: #555;
          ">Dismiss</button>
          <button id="optiprofit-demo-details" style="
            flex: 1;
            padding: 8px 12px;
            background-color: #2196F3;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            color: white;
          ">View Details</button>
        </div>
      </div>
    `;
    
    // Add popup to page
    document.body.appendChild(popup);
    
    // Add event listeners
    document.getElementById('optiprofit-demo-close').addEventListener('click', function() {
      popup.remove();
    });
    
    document.getElementById('optiprofit-demo-dismiss').addEventListener('click', function() {
      popup.remove();
    });
    
    document.getElementById('optiprofit-demo-details').addEventListener('click', function() {
      // Replace with expanded details
      popup.innerHTML = `
        <div style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: bold;">Product Reliability Details</div>
            <div id="optiprofit-demo-back" style="cursor: pointer; font-size: 14px; color: #2196F3;">← Back</div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Delivery Performance</div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
              <span>On-time delivery rate:</span>
              <span style="font-weight: bold; color: #4caf50;">88%</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
              <span>Average delay:</span>
              <span>1.4 days</span>
            </div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Return Analysis</div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
              <span>Return rate:</span>
              <span style="font-weight: bold; color: #f44336;">12%</span>
            </div>
            <div style="margin-top: 8px; background-color: #f9f9f9; padding: 10px; border-radius: 4px; font-size: 13px;">
              <div style="font-weight: bold; margin-bottom: 4px;">Top reasons for returns:</div>
              <ol style="margin: 0 0 0 16px; padding: 0;">
                <li>Size/fit issues (42%)</li>
                <li>Quality not as expected (28%)</li>
                <li>Arrived damaged (15%)</li>
              </ol>
            </div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Monthly Performance</div>
            <div style="display: flex; align-items: flex-end; height: 50px; gap: 4px;">
              <div style="flex: 1; height: 65%; background-color: #2196F3; border-radius: 2px 2px 0 0;"></div>
              <div style="flex: 1; height: 75%; background-color: #2196F3; border-radius: 2px 2px 0 0;"></div>
              <div style="flex: 1; height: 60%; background-color: #2196F3; border-radius: 2px 2px 0 0;"></div>
              <div style="flex: 1; height: 80%; background-color: #2196F3; border-radius: 2px 2px 0 0;"></div>
              <div style="flex: 1; height: 70%; background-color: #2196F3; border-radius: 2px 2px 0 0;"></div>
              <div style="flex: 1; height: 75%; background-color: #2196F3; border-radius: 2px 2px 0 0;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #777; margin-top: 4px;">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
          
          <button id="optiprofit-demo-close-details" style="
            width: 100%;
            padding: 8px 12px;
            background-color: #2196F3;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            color: white;
          ">Close</button>
        </div>
      `;
      
      // Add new event listeners for detailed view
      document.getElementById('optiprofit-demo-back').addEventListener('click', function() {
        popup.remove();
        showDemoPopup(); // Show original popup again
      });
      
      document.getElementById('optiprofit-demo-close-details').addEventListener('click', function() {
        popup.remove();
      });
    });
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (document.body.contains(popup)) {
        popup.remove();
      }
    }, 30000);
  }
  
  // Usage example:
  // If the main functionality fails, you can call:
  showDemoPopup();