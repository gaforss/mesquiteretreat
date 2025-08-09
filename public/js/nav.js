// Lightweight navbar enhancer for admin/vendor topbars
(function initTopbarMobile(){
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  const inner = topbar.querySelector('.topbar-inner') || topbar.querySelector('.container');
  if (!inner) return;

  // Build wrapper around nav + actions so we can drop it down on mobile
  const nav = inner.querySelector('nav');
  const actions = inner.querySelector('.actions');
  if (!nav) return;

  let menuWrap = inner.querySelector('.topbar-menu');
  if (!menuWrap){
    menuWrap = document.createElement('div');
    menuWrap.className = 'topbar-menu';
    // Insert before nav, then move nav and actions into wrapper
    inner.insertBefore(menuWrap, nav);
    menuWrap.appendChild(nav);
    if (actions) menuWrap.appendChild(actions);
  }

  // Inject toggle button if missing
  let toggle = inner.querySelector('.menu-toggle');
  if (!toggle){
    toggle = document.createElement('button');
    toggle.className = 'menu-toggle';
    toggle.id = 'adminNavToggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
    // Place after brand
    const brand = inner.querySelector('.brand');
    if (brand && brand.nextSibling){
      inner.insertBefore(toggle, brand.nextSibling);
    } else if (brand){
      inner.appendChild(toggle);
    } else {
      inner.insertBefore(toggle, inner.firstChild);
    }
  }

  function setOpen(open){
    topbar.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '✕' : '☰';
  }

  toggle.addEventListener('click', ()=>{
    const isOpen = topbar.classList.contains('open');
    setOpen(!isOpen);
  });

  // Close on escape/outside click
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') setOpen(false); }, { passive: true });
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if (!topbar.classList.contains('open')) return;
    if (t && (t.closest && (t.closest('.topbar-menu') || t.closest('.menu-toggle')))) return;
    setOpen(false);
  });

  // Reset on desktop
  window.addEventListener('resize', ()=>{ if (window.innerWidth > 880) setOpen(false); });

  // Scrolled shadow polish
  const onScroll = () => {
    const sc = (document.documentElement.scrollTop || document.body.scrollTop) > 6;
    topbar.classList.toggle('scrolled', sc);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// Public site-header enhancer (hamburger for pages without main.js)
(function initSiteHeader(){
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (!header || !toggle || !siteNav) return;

  function setOpen(open){
    header.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '✕' : '☰';
  }
  toggle.addEventListener('click', ()=>{
    setOpen(!header.classList.contains('open'));
  });
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') setOpen(false); }, { passive: true });
  document.addEventListener('click', (e)=>{
    if (!header.classList.contains('open')) return;
    const t = e.target;
    if (t && (t.closest && (t.closest('#siteNav') || t.closest('#navToggle')))) return;
    setOpen(false);
  });
  window.addEventListener('resize', ()=>{ if (window.innerWidth > 880) setOpen(false); });

  // Scrolled state for public headers
  const onScroll = () => {
    const sc = (document.documentElement.scrollTop || document.body.scrollTop) > 6;
    header.classList.toggle('scrolled', sc);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

