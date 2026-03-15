// ==========================================================================
// SAT NAM RASAYAN – Main JS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Mobile Navigation ---
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navToggle.classList.toggle('open');
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('open');
      });
    });
  }

  // --- Scroll: Nav background ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 40) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });

  // --- Scroll: Fade-in animations ---
  const fadeElements = document.querySelectorAll('.card, .topic-card, .cta-box, .section__header, .step');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger the animation
          setTimeout(() => {
            entry.target.classList.add('fade-in', 'visible');
          }, index * 80);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(el => {
      el.classList.add('fade-in');
      observer.observe(el);
    });
  }

  // --- FAQ Accordion (for article pages) ---
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        document.querySelectorAll('.faq-item').forEach(other => {
          if (other !== item) other.removeAttribute('open');
        });
      }
    });
  });

  // --- Email obfuscation (anti-crawler) ---
  document.querySelectorAll('[data-em]').forEach(el => {
    const addr = atob(el.dataset.em);
    if (el.tagName === 'A') {
      el.href = 'mailto:' + addr;
      el.textContent = addr;
    } else {
      el.textContent = addr;
    }
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
