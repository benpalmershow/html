$(function() {
  // Card/collapsible logic for all pages
  $(document).on('click', '.card-header[data-toggle], .card-header[data-toggle]', function() {
    var cardId = $(this).attr('data-toggle');
    var $content;
    var $icon = $(this).find('.expand-icon');
    if (cardId) {
      $content = $('#' + cardId);
    } else {
      $content = $(this).next('.card-content');
    }
    if ($content.length && $icon.length) {
      $content.toggleClass('expanded');
      if ($content.hasClass('expanded')) {
        $icon.text('−').css('transform', 'rotate(180deg)');
      } else {
        $icon.text('+').css('transform', 'rotate(0deg)');
      }
    }
  });
}); 