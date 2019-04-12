window.loadBundles = function(modernScripts, legacyScripts) {
  /* polyfill for Safari 10.1 modules support */
  (function() {
    var d = document;
    var c = d.createElement('script');
    if (!('noModule' in c) && 'onbeforeload' in c) {
      var s = false;
      d.addEventListener('beforeload', function(e) {
        if (e.target === c) {
          s = true;
        } else if (!e.target.hasAttribute('nomodule') || !s) {
          return;
        }
        e.preventDefault();
      }, true);

      c.type = 'module';
      c.src = '.';
      d.head.appendChild(c);
      c.remove();
    }
  }());
  function createScript(text) {
    var script = document.createElement('script');
    script.text = text;
    return script;
  }

  window.loadScripts = function loadScripts(urls) {
    urls && urls.forEach(function (src) {
      var s = document.createElement('script');
      s.setAttribute('src', src);
      document.body.appendChild(s);
    });
  };

  window.selectScripts = function loadScripts(type) {
    if (type === 'MODERN') {
      console.log('MODERN');
      window.loadScripts(modernScripts)
    } else if (type === 'LEGACY') {
      console.log('LEGACY');
      window.loadScripts(legacyScripts)
    }
  };
  var moduleScript = createScript('window.selectScripts("MODERN")');
  var nomoduleScript = createScript('window.selectScripts("LEGACY")');
  moduleScript.setAttribute('type', 'module');
  nomoduleScript.setAttribute('nomodule', 'true');
  document.body.appendChild(moduleScript);
  document.body.appendChild(nomoduleScript);

  document.body.removeChild(moduleScript);
  document.body.removeChild(nomoduleScript);
};

