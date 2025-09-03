// Financials Chart Modal Functionality
function setupChartIconHandlers() {
    document.querySelectorAll('.chart-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Show the chart modal
            const modal = document.getElementById('chartModal');
            modal.style.display = 'block';
            
            // Process Infogram embeds if not already done
            if (window.InfogramEmbeds && window.InfogramEmbeds.process) {
                window.InfogramEmbeds.process();
            }
        });
    });
}

// Setup modal close functionality
function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    const closeBtn = document.getElementById('closeChartModal');
    
    // Close button click
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Click outside modal to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Export functions for use in main financials.js
window.setupChartIconHandlers = setupChartIconHandlers;
window.setupModalHandlers = setupModalHandlers;
