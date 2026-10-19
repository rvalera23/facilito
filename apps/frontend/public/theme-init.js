// frontend/public/theme-init.js

(function() {
  try {
    const fontWeights = {
      'Quicksand': '400;500;600;700',
      'Inter': '400;500;600;700',
      'Poppins': '300;400;500;600;700',
      'Nunito': '400;500;600;700',
      'Montserrat': '400;500;600;700',
      'Roboto': '300;400;500;700',
      'Open Sans': '300;400;500;600;700',
      'Lato': '300;400;700',
      'Raleway': '400;500;600;700',
      'Playfair Display': '400;500;600;700',
      'Merriweather': '300;400;700',
      'DM Serif Display': '400',
      'Cormorant Garamond': '400;500;600;700',
      'JetBrains Mono': '400;500;600;700',
      'Fira Code': '400;500;600;700'
    };

    function applyFont(font) {
      const selectedFont = fontWeights[font] ? font : 'Quicksand';
      if (selectedFont !== 'Quicksand') {
        const fontId = 'facilito-font-' + selectedFont.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!document.getElementById(fontId)) {
          const link = document.createElement('link');
          link.id = fontId;
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(selectedFont) + ':wght@' + fontWeights[selectedFont] + '&display=swap';
          document.head.appendChild(link);
        }
      }
      document.documentElement.style.setProperty('--font-sans', selectedFont === 'Quicksand' ? 'var(--font-quicksand)' : "'" + selectedFont + "', sans-serif");
    }

    // 🔥 OBTENER PALETAS DESDE EL HTML (inyectadas por el servidor)
    function getPalettes() {
      try {
        const palettesElement = document.getElementById('palettes-data');
        if (palettesElement) {
          return JSON.parse(palettesElement.textContent || '[]');
        }
      } catch (e) {}
      return [];
    }

    // 🔥 FUNCIÓN PARA APLICAR EL TEMA
    function applyTheme() {
      const theme = localStorage.getItem('theme');
      if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }

      const palettes = getPalettes();
      const savedId = localStorage.getItem('selected_app_theme');
      
      if (savedId && palettes.length > 0) {
        const currentPalette = palettes.find(p => p.id === savedId);
        if (currentPalette) {
          const root = document.documentElement;
          root.style.setProperty('--color-primary', currentPalette.primary);
          root.style.setProperty('--color-secondary', currentPalette.secondary);
          root.style.setProperty('--color-accent', currentPalette.accent);
          root.style.setProperty('--color-background', currentPalette.background);
          root.style.setProperty('--bg-color', currentPalette.background);
          root.setAttribute('data-theme', currentPalette.id);
          
          const themeData = {
            primaryColor: currentPalette.primary,
            secondaryColor: currentPalette.secondary,
            accentColor: currentPalette.accent,
            backgroundColor: currentPalette.background,
          };
          localStorage.setItem('app_theme', JSON.stringify(themeData));
        }
      }

      // 🔥 APLICAR LA FUENTE GUARDADA
      const savedFont = localStorage.getItem('selected_font');
      if (savedFont) {
        applyFont(savedFont);
      }
    }

    // 🔥 EVENT LISTENERS
    function setupEventListeners() {
      // Storage events
      window.addEventListener('storage', function(e) {
        if (e.key === 'selected_app_theme' || e.key === 'app_theme' || e.key === 'theme' || e.key === 'selected_font') {
          applyTheme();
        }
      });

      // Theme updated
      window.addEventListener('themeUpdated', function(e) {
        if (e.detail) {
          const root = document.documentElement;
          const colors = e.detail;
          if (colors.primaryColor) root.style.setProperty('--color-primary', colors.primaryColor);
          if (colors.secondaryColor) root.style.setProperty('--color-secondary', colors.secondaryColor);
          if (colors.accentColor) root.style.setProperty('--color-accent', colors.accentColor);
          if (colors.backgroundColor) {
            root.style.setProperty('--color-background', colors.backgroundColor);
            root.style.setProperty('--bg-color', colors.backgroundColor);
          }
          localStorage.setItem('app_theme', JSON.stringify(colors));
        }
      });

      // Tenant theme updated
      window.addEventListener('tenantThemeUpdated', function(e) {
        if (e.detail) {
          const root = document.documentElement;
          const colors = e.detail;
          if (colors.primaryColor) {
            root.style.setProperty('--color-primary', colors.primaryColor);
            localStorage.setItem('selected_app_theme', 'custom');
          }
          if (colors.secondaryColor) root.style.setProperty('--color-secondary', colors.secondaryColor);
          if (colors.accentColor) root.style.setProperty('--color-accent', colors.accentColor);
          if (colors.backgroundColor) {
            root.style.setProperty('--color-background', colors.backgroundColor);
            root.style.setProperty('--bg-color', colors.backgroundColor);
          }
          if (colors.fontFamily) {
            applyFont(colors.fontFamily);
            localStorage.setItem('selected_font', colors.fontFamily);
          }
          const themeData = {
            primaryColor: colors.primaryColor,
            secondaryColor: colors.secondaryColor,
            accentColor: colors.accentColor || '#3b82f6',
            backgroundColor: colors.backgroundColor || '#0b0f19',
            fontFamily: colors.fontFamily || 'Quicksand',
          };
          localStorage.setItem('app_theme', JSON.stringify(themeData));
          window.dispatchEvent(new CustomEvent('themeUpdated', { detail: themeData }));
        }
      });

      // Font changed
      window.addEventListener('fontChanged', function(e) {
        if (e.detail && e.detail.font) {
          applyFont(e.detail.font);
          localStorage.setItem('selected_font', e.detail.font);
        }
      });

      // Tenant loaded
      window.addEventListener('tenantLoaded', function(e) {
        if (e.detail) {
          const tenant = e.detail;
          const config = tenant.specificConfig || tenant.specific_config || {};
          const colors = {
            primaryColor: config.primaryColor || tenant.primaryColor || tenant.primary_color,
            secondaryColor: config.secondaryColor || tenant.secondaryColor || tenant.secondary_color,
            accentColor: config.accentColor || tenant.accentColor || tenant.accent_color,
            backgroundColor: config.backgroundColor || tenant.backgroundColor || tenant.background_color,
            fontFamily: config.fontFamily || tenant.fontFamily || 'Quicksand',
          };
          if (colors.primaryColor) {
            window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { detail: colors }));
          }
        }
      });

      // 🔥 REAPPLY THEME DESPUÉS DE LA HIDRATACIÓN DE REACT
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(applyTheme, 50);
        });
      } else {
        setTimeout(applyTheme, 50);
      }

      // 🔥 REAPPLY THEME DESPUÉS DE QUE NEXT.JS TERMINE LA HIDRATACIÓN
      const observer = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const hasScripts = document.querySelector('script[data-next-hydration]');
            if (!hasScripts) {
              // La hidratación ya pasó
              setTimeout(applyTheme, 100);
              observer.disconnect();
              break;
            }
          }
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });

      // Fallback después de 3 segundos
      setTimeout(function() {
        observer.disconnect();
        applyTheme();
      }, 3000);

      console.log('🎨 [theme-init] Sistema de temas y fuentes inicializado correctamente');
    }

    // 🚀 INICIAR
    applyTheme();
    setupEventListeners();
  } catch (e) {
    console.error('Error al inicializar temas:', e);
  }
})();