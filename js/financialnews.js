// Handles all card toggling for financialnews.html
function toggleCard(cardId) {
  const content = document.getElementById(cardId);
  const toggle = document.getElementById(cardId.replace('-card', '-toggle'));
  if (content.classList.contains('expanded')) {
    content.classList.remove('expanded');
    toggle.classList.remove('rotated');
  } else {
    content.classList.add('expanded');
    toggle.classList.add('rotated');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Cards start collapsed by default due to max-height: 0
  // Add any additional DOM-ready logic here if needed
});
