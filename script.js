// Proxy loader to load app.js safely
(function() {
  if (typeof appState === 'undefined') {
    const s = document.createElement('script');
    s.src = 'app.js';
    document.head.appendChild(s);
  }
})();
