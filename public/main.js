/* ---------- Soft stars ---------- */
(function sky() {
  const canvas = document.getElementById('sky');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];
  let w = 0;
  let h = 0;
  let frame = 0;

  // Small seeded generator so the sky looks the same on every visit and resize.
  function seeded(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = seeded(20260);
    // Soft stars, never a dense glitter field.
    const count = Math.max(60, Math.min(170, Math.round((w * h) / 9000)));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rand() * w,
        y: rand() * h,
        r: 0.4 + rand() * 0.9,
        base: 0.22 + rand() * 0.5,
        gold: rand() < 0.14,
        speed: 0.25 + rand() * 0.6,
        phase: rand() * Math.PI * 2,
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const twinkle = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(s.phase + t * 0.001 * s.speed);
      ctx.globalAlpha = s.base * twinkle;
      ctx.fillStyle = s.gold ? '#E8A44C' : '#F5EFE6';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    draw(t);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(frame);
    build();
    if (reduceMotion) draw(0);
    else frame = requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, 150);
  });
  document.addEventListener('visibilitychange', function () {
    if (reduceMotion) return;
    cancelAnimationFrame(frame);
    if (!document.hidden) frame = requestAnimationFrame(loop);
  });

  start();
})();

/* ---------- Waitlist ---------- */
(function waitlist() {
  const form = document.getElementById('waitlist');
  if (!form) return;
  const input = form.querySelector('#email');
  const honeypot = form.querySelector('#company');
  const button = form.querySelector('button');
  const note = document.getElementById('form-note');
  const thanks = document.getElementById('thanks');
  const defaultNote = note.textContent.trim();
  const defaultButton = button.textContent;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setNote(text, isError) {
    note.textContent = text;
    note.classList.toggle('is-error', Boolean(isError));
  }

  input.addEventListener('input', function () {
    if (note.classList.contains('is-error')) setNote(defaultNote, false);
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const email = input.value.trim();

    if (!EMAIL.test(email)) {
      setNote('That email doesn’t look quite right. Try once more.', true);
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'One moment…';
    setNote(defaultNote, false);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, company: honeypot.value }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Something went quiet on our end. Please try again in a moment.');
      }
      form.hidden = true;
      thanks.hidden = false;
      thanks.focus();
    } catch (err) {
      const offline = err instanceof TypeError;
      setNote(
        offline ? 'We couldn’t reach the list. Check your connection and try again.' : err.message,
        true
      );
      button.disabled = false;
      button.textContent = defaultButton;
    }
  });
})();
