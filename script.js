/* =========================================================================
   VIREN SINGH — PORTFOLIO · ANIMATION ENGINE
   Pure vanilla JS, no dependencies. Organized into clearly labeled
   sections. Everything scroll-driven runs off a single rAF loop so we
   never do more than one layout read + one set of style writes per frame.
   ========================================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
const root = document.documentElement;

/* =========================================================================
   0. SHARED SCROLL STATE
   One scroll listener feeds every animation system below so we don't
   stack multiple competing scroll handlers.
   ========================================================================= */
let scrollY = window.scrollY;
let docProgress = 0; // 0 → 1 across the ENTIRE page height
let ticking = false;

function measure(){
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  docProgress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
}

function frame(){
  measure();
  updateColorSystem(docProgress);
  updateVeil(docProgress);
  updateGem(docProgress);
  updateHeaderAndProgress(docProgress);
  ticking = false;
}

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  if(!ticking){ requestAnimationFrame(frame); ticking = true; }
}, { passive:true });


/* =========================================================================
   1. SCROLL COLOR SYSTEM
   The entire page — background, ink, muted text, glass panels, borders,
   accent gradient — is one continuous cinematic gradient across scroll
   progress. Instead of "dark sections" vs "light sections", the whole
   document is a single journey from warm cream daylight into a
   near-black, gold/cyan-lit night. Colors are written as CSS custom
   properties every frame, and every element in styles.css just reads
   var(--bg), var(--ink), etc — so nothing needs per-section classes.
   ========================================================================= */
const COLOR_STOPS = [
  { p:0.00, bg:'#faf8f3', bg2:'#f2efe7', ink:'#0c0c0c', muted:'#5a5850', muted2:'#8b8878', glassA:0.045, glassBase:'10,10,8', accentA:'#0c0c0c', accentB:'#8a6a2f' },
  { p:0.32, bg:'#efeadf', bg2:'#e6dfd0', ink:'#111111', muted:'#54514a', muted2:'#847e6d', glassA:0.06,  glassBase:'10,10,8', accentA:'#22190b', accentB:'#b98a3a' },
  { p:0.55, bg:'#3c362c', bg2:'#2c271f', ink:'#f6f3ea', muted:'#c8c0ac', muted2:'#9a917c', glassA:0.07,  glassBase:'255,255,255', accentA:'#d8ac5e', accentB:'#5eead4' },
  { p:0.78, bg:'#0e0e11', bg2:'#0a0a0c', ink:'#f6f4ef', muted:'#a3a19a', muted2:'#767469', glassA:0.06,  glassBase:'255,255,255', accentA:'#5eead4', accentB:'#d8ac5e' },
  { p:1.00, bg:'#040405', bg2:'#000000', ink:'#f6f4ef', muted:'#8f8d86', muted2:'#5f5d57', glassA:0.055, glassBase:'255,255,255', accentA:'#d8ac5e', accentB:'#5eead4' },
];

function hexToRgb(hex){
  const n = parseInt(hex.replace('#',''),16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}
function lerp(a,b,t){ return a+(b-a)*t; }
function lerpHex(h1,h2,t){
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t));
}

function updateColorSystem(p){
  // find the two stops p falls between
  let i = 0;
  while(i < COLOR_STOPS.length-2 && p > COLOR_STOPS[i+1].p) i++;
  const s1 = COLOR_STOPS[i], s2 = COLOR_STOPS[i+1];
  const span = s2.p - s1.p || 1;
  const t = Math.min(1, Math.max(0, (p - s1.p) / span));

  const bg = lerpHex(s1.bg, s2.bg, t);
  const bg2 = lerpHex(s1.bg2, s2.bg2, t);
  const ink = lerpHex(s1.ink, s2.ink, t);
  const muted = lerpHex(s1.muted, s2.muted, t);
  const muted2 = lerpHex(s1.muted2, s2.muted2, t);
  const accentA = lerpHex(s1.accentA, s2.accentA, t);
  const accentB = lerpHex(s1.accentB, s2.accentB, t);
  const glassA = lerp(s1.glassA, s2.glassA, t);
  const glassBase = t < 0.5 ? s1.glassBase : s2.glassBase; // swap glass tint light/dark at midpoint

  const st = root.style;
  st.setProperty('--bg', bg);
  st.setProperty('--bg2', bg2);
  st.setProperty('--ink', ink);
  st.setProperty('--muted', muted);
  st.setProperty('--muted-2', muted2);
  st.setProperty('--accent-a', accentA);
  st.setProperty('--accent-b', accentB);
  st.setProperty('--glass', `rgba(${glassBase},${glassA})`);
  st.setProperty('--glass-hover', `rgba(${glassBase},${glassA*1.9})`);
  st.setProperty('--border', `rgba(${glassBase},${glassA*2.6})`);
  st.setProperty('--border-hover', `rgba(${glassBase},${glassA*5.2})`);
}


/* =========================================================================
   2. FOCUS / BLUR VEIL
   A soft "camera racking focus" pass: blur + darkness intensify as we
   move through the mid-scroll transition zone (dusk → night), then
   clear again once we've settled into the dark, content-heavy sections.
   ========================================================================= */
function bell(x, center, width){
  const d = (x - center) / width;
  return Math.max(0, 1 - d*d);
}
function updateVeil(p){
  if(reduceMotion){ return; }
  const intensity = bell(p, 0.52, 0.22); // peaks mid-scroll, ~0 at ends
  root.style.setProperty('--veil-blur', (intensity*10).toFixed(2)+'px');
  root.style.setProperty('--veil-opacity', (intensity*0.22).toFixed(3));
}


/* =========================================================================
   3. THE GEM — fixed 3D centerpiece
   Two motion layers:
     a) SCROLL-DRIVEN — continuous Y-rotation tied to scroll position,
        a scale/position shift from "centered hero object" toward a
        smaller "living badge" anchored near the top-right once you've
        scrolled past the intro, and a gentle X-tilt.
     b) POINTER-DRIVEN — an additive rotation offset so the gem visibly
        "looks toward" the cursor/drag position (section 5 wires this).
   ========================================================================= */
const gemStage = document.getElementById('gemStage');
const gemSpin = document.getElementById('gemSpin');

let pointerTiltX = 0, pointerTiltY = 0; // set by cursor system, degrees
let dragTwist = 0; // extra facet twist from wheel/drag energy, decays each frame

function updateGem(p){
  if(!gemStage) return;

  // --- stage position: center (hero) → small badge, top-right corner
  const settleT = Math.min(1, p / 0.30); // fully "settled" by 30% scroll
  const eased = settleT*settleT*(3-2*settleT); // smoothstep
  const vw = window.innerWidth, vh = window.innerHeight;
  // on wide screens the hero text is left-aligned, so rest the gem in the
  // open whitespace to the right rather than dead-center over the copy
  const cx = vw > 900 ? vw*0.74 : vw/2;
  const cy = vh/2;
  const tx = lerp(cx, vw-96, eased);
  const ty = lerp(cy, 96, eased);
  const scale = lerp(1, 0.34, eased);
  const stageOpacity = lerp(1, 0.85, eased);

  gemStage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  gemStage.style.opacity = stageOpacity;

  // --- spin: continuous rotation tied to scroll (the "cinematic" turn)
  const scrollSpin = p * 900; // degrees over full document
  const tiltBase = lerp(-8, 22, eased); // leans back slightly as it recedes
  const rx = tiltBase + pointerTiltY;
  const ry = scrollSpin + pointerTiltX + dragTwist;

  gemSpin.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;

  // decay the drag twist so flicks settle back to the scroll-driven spin
  dragTwist *= 0.94;
}


/* =========================================================================
   4. HEADER SHADOW, SCROLL PROGRESS BAR, ACTIVE NAV LINK
   ========================================================================= */
const header = document.getElementById('siteHeader');
const progressBar = document.getElementById('progressBar');
const siteNav = document.getElementById('siteNav');
const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...siteNav.querySelectorAll('a')];

function updateHeaderAndProgress(p){
  header.classList.toggle('scrolled', scrollY > 8);
  progressBar.style.width = (p*100)+'%';
  let current = null;
  sections.forEach(s => { if(scrollY+90 >= s.offsetTop) current = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+current));
}

const navToggle = document.getElementById('navToggle');
navToggle.addEventListener('click', () => {
  const open = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open ? 'true':'false');
});
siteNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  siteNav.classList.remove('open'); navToggle.setAttribute('aria-expanded','false');
}));


/* =========================================================================
   5. CUSTOM CURSOR SYSTEM
   Core dot (snappy) + trailing aura ring (lags behind, lerped each
   frame) + spawned particle trail. Magnetic pull on interactive
   elements: the element itself nudges toward the cursor, and the
   cursor ring grows/tints to "swallow" it.
   ========================================================================= */
if(isFinePointer && !reduceMotion){
  root.classList.add('has-custom-cursor');

  const cursorDot = document.getElementById('cursorDot');
  const cursorRing = document.getElementById('cursorRing');

  let mouseX = innerWidth/2, mouseY = innerHeight/2;
  let ringX = mouseX, ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    maybeSpawnParticle(mouseX, mouseY);
    driveGemTowardCursor(mouseX, mouseY);
  }, { passive:true });

  // ring lags behind the dot for a soft "aura" trailing feel
  function ringLoop(){
    ringX = lerp(ringX, mouseX, 0.16);
    ringY = lerp(ringY, mouseY, 0.16);
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
    requestAnimationFrame(ringLoop);
  }
  requestAnimationFrame(ringLoop);

  // --- particle trail: small dots spawned on movement, fade + float out
  let lastSpawn = 0;
  function maybeSpawnParticle(x,y){
    const now = performance.now();
    if(now - lastSpawn < 40) return; // throttle
    lastSpawn = now;
    const p = document.createElement('span');
    p.className = 'trail-particle';
    p.style.left = x+'px';
    p.style.top = y+'px';
    document.body.appendChild(p);
    const angle = Math.random()*Math.PI*2;
    const dist = 14 + Math.random()*18;
    const dx = Math.cos(angle)*dist, dy = Math.sin(angle)*dist;
    p.animate([
      { transform:'translate(-50%,-50%) scale(1)', opacity:.8 },
      { transform:`translate(${dx-2}px, ${dy-2}px) scale(0)`, opacity:0 }
    ], { duration:650, easing:'cubic-bezier(.16,.84,.32,1)' }).onfinish = () => p.remove();
  }

  // --- magnetic elements: buttons, nav links, cards pull toward cursor
  const magnets = document.querySelectorAll('.button, .download, nav a, .community-link');
  magnets.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorRing.classList.add('magnetic');
      cursorDot.style.opacity = '0';
    });
    el.addEventListener('mouseleave', () => {
      cursorRing.classList.remove('magnetic');
      cursorDot.style.opacity = '1';
      el.style.transform = '';
    });
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left - r.width/2) * 0.35;
      const my = (e.clientY - r.top - r.height/2) * 0.35;
      el.style.transform = `translate(${mx}px, ${my}px)`;
    });
  });

  // text cursor state on headings/paragraphs (thin bar instead of ring)
  document.querySelectorAll('h1, h2, h3, p').forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing.classList.add('text'));
    el.addEventListener('mouseleave', () => cursorRing.classList.remove('text'));
  });

  // --- gem reacts when the cursor passes near it (only while centered/large)
  function driveGemTowardCursor(x,y){
    const r = gemStage.getBoundingClientRect();
    const gx = r.left + r.width/2, gy = r.top + r.height/2;
    const dist = Math.hypot(x-gx, y-gy);
    const radius = 420;
    if(dist < radius){
      const strength = (1 - dist/radius);
      pointerTiltX = ((x-gx)/radius) * 26 * strength;
      pointerTiltY = ((y-gy)/radius) * -18 * strength;
    } else {
      pointerTiltX = lerp(pointerTiltX, 0, 0.06);
      pointerTiltY = lerp(pointerTiltY, 0, 0.06);
    }
  }
} else {
  // touch / coarse-pointer devices: no custom cursor, no magnetism
  document.getElementById('cursorDot')?.remove();
  document.getElementById('cursorRing')?.remove();
}

/* wheel "drag" energy — flicking the wheel fast gives the gem an extra
   twist that decays back into the normal scroll spin (section 3 reads
   dragTwist each frame) */
window.addEventListener('wheel', e => {
  dragTwist += Math.max(-40, Math.min(40, e.deltaY * 0.15));
}, { passive:true });


/* =========================================================================
   6. CARD TILT + SHINE (pointer-fine devices only)
   3D tilt based on pointer position inside the card, plus a radial
   highlight (--mx/--my custom props, read by the ::before shine layer
   in styles.css).
   ========================================================================= */
if(isFinePointer && !reduceMotion){
  document.querySelectorAll('.research-item, .project-card, .achievement, .link-panel > div').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width, py = (e.clientY - r.top)/r.height;
      const rx = (0.5 - py) * 10, ry = (px - 0.5) * 10;
      card.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px) scale(1.015)`;
      card.style.setProperty('--mx', (px*100)+'%');
      card.style.setProperty('--my', (py*100)+'%');
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}


/* =========================================================================
   7. SCROLL REVEAL (IntersectionObserver) + STAGGERED GRID CHILDREN
   ========================================================================= */
document.querySelectorAll('.research-list, .project-grid, .achievement-grid, .link-panel').forEach(grid => {
  [...grid.children].forEach((el,i) => { el.classList.add('reveal'); el.style.setProperty('--d',(i*70)+'ms'); });
});

if('IntersectionObserver' in window){
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in-view'); io.unobserve(en.target); } });
  }, { threshold:.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
}


/* =========================================================================
   8. COUNT-UP STATS
   ========================================================================= */
const counters = document.querySelectorAll('[data-count]');
if(counters.length){
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if(!en.isIntersecting) return;
      const el = en.target, target = +el.dataset.count, dur = 900, start = performance.now();
      if(reduceMotion){ el.textContent = target; cio.unobserve(el); return; }
      const step = now => {
        const p = Math.min((now-start)/dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1-p,3)));
        if(p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  }, { threshold:.6 });
  counters.forEach(el => cio.observe(el));
}


/* =========================================================================
   9. CLICKABLE CARDS + BUTTON RIPPLE
   ========================================================================= */
document.querySelectorAll('[data-href]').forEach(x => {
  const open = () => window.open(x.dataset.href, '_blank', 'noopener');
  x.tabIndex = 0; x.setAttribute('role','link');
  const label = x.querySelector('h3'); if(label) x.setAttribute('aria-label', label.textContent+' — open document');
  x.onclick = e => { if(!e.target.closest('a')) open(); };
  x.onkeydown = e => { if(e.key === 'Enter') open(); };
});

document.querySelectorAll('.button, .download').forEach(btn => {
  btn.addEventListener('click', e => {
    const r = btn.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.left = (e.clientX - r.left)+'px';
    s.style.top = (e.clientY - r.top)+'px';
    btn.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  });
});


/* =========================================================================
   10. INITIAL PAINT
   Run the color/gem/veil systems once immediately so the page isn't
   unstyled-white for a frame before the first scroll event fires.
   ========================================================================= */
frame();
window.addEventListener('resize', frame);
