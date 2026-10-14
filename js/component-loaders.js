// Component loaders for financials.html
// Consolidates component fetch operations to reduce inline scripts

function loadComponent(containerId, componentPath, handler) {
  fetch(componentPath)
    .then(response => {
      if (!response.ok) throw new Error(`Component not found: ${componentPath} (${response.status})`);
      return response.text();
    })
    .then(html => {
      if (handler) {
        handler(html);
      } else {
        document.getElementById(containerId).innerHTML = html;
      }
    })
    .catch(error => console.error(`${componentPath} load error:`, error));
}

// Footer is now inlined directly in HTML for no-JS accessibility

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
