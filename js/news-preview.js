/**
 * News Preview Cards JavaScript
 * Handles preview text truncation and Read More/Read Less functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializePreviewCards();
});

function initializePreviewCards() {
    // Convert existing cards to preview format
    const existingCards = document.querySelectorAll('.card-header[onclick*="toggleCard"]');
    
    existingCards.forEach(convertToPreviewCard);
    
    // Initialize Read More buttons
    const readMoreBtns = document.querySelectorAll('.read-more-btn');
    readMoreBtns.forEach(btn => {
        btn.addEventListener('click', handleReadMoreClick);
    });
}

function convertToPreviewCard(cardHeader) {
    const cardContent = cardHeader.nextElementSibling;
    if (!cardContent || !cardContent.classList.contains('card-content')) return;
    
    // Extract card data
    const time = cardHeader.querySelector('time');
    const icon = cardHeader.querySelector('.card-icon');
    const title = cardHeader.querySelector('h1');
    const categoryBadge = cardHeader.querySelector('.category-badge');
    
    // Get first paragraph or section for preview
    const cardInner = cardContent.querySelector('.card-inner');
    const previewText = generatePreviewText(cardInner);
    
    // Create new preview card structure
    const newCard = document.createElement('div');
    newCard.className = 'news-card';
    newCard.setAttribute('data-category', categoryBadge ? categoryBadge.textContent.toLowerCase() : 'all');
    
    // Clean the title HTML to remove any badges
    let cleanTitle = '';
    if (title) {
        const titleClone = title.cloneNode(true);
        // Remove any badges from the title
        const badges = titleClone.querySelectorAll('.category-badge');
        badges.forEach(badge => badge.remove());
        cleanTitle = titleClone.innerHTML.trim();
    }
    
    newCard.innerHTML = `
        <div class="news-card-header">
            <i data-lucide="${icon ? icon.getAttribute('data-lucide') : 'file-text'}" class="news-card-icon"></i>
            <div class="news-card-meta">
                <div class="news-card-date">${time ? time.textContent : ''}</div>
                <h2 class="news-card-title">${cleanTitle}</h2>
            </div>
            <div class="news-card-badge-corner">
                ${categoryBadge ? categoryBadge.outerHTML : ''}
            </div>
        </div>
        <div class="news-card-content">
            <div class="news-card-preview">${previewText}</div>
            <div class="news-card-actions">
                <button class="read-more-btn" data-card-id="${generateCardId()}">
                    <span class="btn-text">Read More</span>
                    <i data-lucide="chevron-down"></i>
                </button>
            </div>
            <div class="news-card-full">
                ${cardInner ? cardInner.innerHTML : ''}
            </div>
        </div>
    `;
    
    // Replace old card structure
    const cardContainer = cardHeader.parentNode;
    cardContainer.insertBefore(newCard, cardHeader);
    cardContainer.removeChild(cardHeader);
    cardContainer.removeChild(cardContent);
    
    // Reinitialize Lucide icons for the new card
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function generatePreviewText(cardInner) {
    if (!cardInner) return 'Click to read more...';
    
    // Get the first meaningful text content
    let previewText = '';
    const firstSection = cardInner.querySelector('.section, .highlights, p, div');
    
    if (firstSection) {
        // Extract plain text, removing HTML tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = firstSection.innerHTML;
        
        // Remove any nested sections, tables, or complex elements for preview
        const complexElements = tempDiv.querySelectorAll('table, .table-container, .chart-container, blockquote, .case-questions');
        complexElements.forEach(el => el.remove());
        
        previewText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean up and truncate
        previewText = previewText.trim().replace(/\s+/g, ' ');
        
        // Truncate to reasonable length
        if (previewText.length > 200) {
            previewText = previewText.substring(0, 200).trim();
            // Try to end at a word boundary
            const lastSpace = previewText.lastIndexOf(' ');
            if (lastSpace > 150) {
                previewText = previewText.substring(0, lastSpace);
            }
            previewText += '...';
        }
    }
    
    return previewText || 'Click to read the full article...';
}

function handleReadMoreClick(event) {
    const btn = event.currentTarget;
    const card = btn.closest('.news-card');
    const fullContent = card.querySelector('.news-card-full');
    const btnText = btn.querySelector('.btn-text');
    const btnIcon = btn.querySelector('i');
    
    if (fullContent.classList.contains('show')) {
        // Collapse
        fullContent.classList.remove('show');
        btnText.textContent = 'Read More';
        btn.classList.remove('expanded');
        
        // Scroll back to card top
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // Expand
        fullContent.classList.add('show');
        btnText.textContent = 'Read Less';
        btn.classList.add('expanded');
        
        // Reinitialize any dynamic content (charts, etc.)
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
    }
}

function generateCardId() {
    return 'card_' + Math.random().toString(36).substr(2, 9);
}

// Update existing filter functionality to work with new card structure
function updateFilterFunctionality() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter cards
            const cards = document.querySelectorAll('.news-card');
            cards.forEach(card => {
                const cardCategory = card.dataset.category;
                
                if (category === 'all' || cardCategory === category || 
                    (cardCategory && cardCategory.includes(category))) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Initialize filter functionality after cards are converted
setTimeout(updateFilterFunctionality, 100);