// Open PDF links and my.idfcfirst links in a new tab
function processLink(a) {
    if (a.href && (a.href.includes('.pdf') || a.href.includes('my.idfcfirst'))) {
        a.target = '_blank';
    }
}

// Process all existing links
document.querySelectorAll('a').forEach(processLink);

// Watch for dynamically added links (e.g., header navigation fragments)
const linkObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // If the added node is a link, process it
                if (node.tagName === 'A') {
                    processLink(node);
                }
                // If the added node contains links, process them all
                node.querySelectorAll?.('a').forEach(processLink);
            }
        });
    });
});

// Observe the entire document for added nodes
linkObserver.observe(document.body, {
    childList: true,
    subtree: true,
});

const scriptCode = document.createElement('script');
scriptCode.innerHTML = `
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-M5CHMQ2Z');`;
document.querySelector('head').append(scriptCode);

const noscript = document.createElement('noscript');
const iframe = document.createElement('iframe');
iframe.src = 'https://www.googletagmanager.com/ns.html?id=GTM-M5CHMQ2Z';
iframe.height = '0';
iframe.width = '0';
iframe.style.display = 'none';
iframe.style.visibility = 'hidden';
noscript.appendChild(iframe);
document.body.appendChild(noscript);
console.log(noscript); // eslint-disable-line no-console
