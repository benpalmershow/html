// Component loaders for financials.html
// Consolidates component fetch operations to reduce inline scripts

function loadComponent(containerId, componentPath, handler) {
  fetch(componentPath)
    .then(response => response.text())
    .then(html => {
      if (handler) {
        handler(html);
      } else {
        document.getElementById(containerId).innerHTML = html;
      }
    })
    .catch(error => console.error(`${componentPath} load error:`, error));
}

// Load footer component
document.addEventListener('DOMContentLoaded', function () {
  loadComponent('footer-container', 'components/footer.html');
});

// Load error handling component with script execution
loadComponent(null, 'components/error-handling.html', function (html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const scriptElements = tempDiv.querySelectorAll('script');
  scriptElements.forEach(script => {
    const newScript = document.createElement('script');
    newScript.textContent = script.textContent;
    document.head.appendChild(newScript);
  });
});

// Load unified scripts component with script execution
loadComponent(null, 'components/scripts-unified.html', function (html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const scriptElements = tempDiv.querySelectorAll('script');
  scriptElements.forEach(script => {
    const newScript = document.createElement('script');
    newScript.textContent = script.textContent;
    document.head.appendChild(newScript);
  });
});

// Load analytics component with script execution
loadComponent(null, 'components/analytics.html', function (html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const scriptElements = tempDiv.querySelectorAll('script');
  scriptElements.forEach(script => {
    const newScript = document.createElement('script');
    newScript.textContent = script.textContent;
    document.head.appendChild(newScript);
  });
});
