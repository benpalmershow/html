// Card/collapsible logic for watch.html
// Use event delegation and no inline handlers

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.card-header[data-toggle]').forEach(function(header) {
    header.addEventListener('click', function(e) {
      const cardId = header.getAttribute('data-toggle');
      if (cardId) window.toggleCard(cardId);
    });
  });
});

window.toggleCard = function(cardId) {
  const content = document.getElementById(cardId);
  if (content) {
    content.classList.toggle('open');
  }
};
