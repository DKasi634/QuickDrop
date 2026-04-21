export function triggerSelfDestruct(onComplete: () => void): void {
  const overlay = document.getElementById('self-destruct-overlay');
  const countdownEl = document.getElementById('self-destruct-countdown');
  const contentCard = document.getElementById('viewer-card');

  if (!overlay || !countdownEl) {
    onComplete();
    return;
  }

  overlay.classList.remove('hidden');

  let count = 3;
  countdownEl.textContent = count.toString();

  const timer = setInterval(() => {
    count--;

    if (count > 0) {
      countdownEl.textContent = count.toString();
      countdownEl.style.animation = 'none';
      void countdownEl.offsetHeight;
      countdownEl.style.animation = 'countdownPulse 1s ease-in-out infinite';
    } else if (count === 0) {
      countdownEl.textContent = '💥';
      countdownEl.style.fontSize = '80px';
      countdownEl.style.animation = 'none';

      const text = overlay.querySelector('.self-destruct-text');
      if (text) {
        text.textContent = 'BOOM!';
        (text as HTMLElement).style.color = '#f87171';
        (text as HTMLElement).style.fontSize = '20px';
      }

      if (contentCard) {
        contentCard.style.animation = 'dissolve 1s ease forwards';
      }
    } else {
      clearInterval(timer);
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.opacity = '';
        onComplete();
      }, 500);
    }
  }, 1000);
}

export function createDestructParticles(container: HTMLElement): void {
  const particles = ['💥', '✨', '🔥', '💨', '⚡'];
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.textContent = particles[Math.floor(Math.random() * particles.length)];
    particle.style.cssText = `
      position: fixed;
      left: ${20 + Math.random() * 60}%;
      top: ${20 + Math.random() * 60}%;
      font-size: ${12 + Math.random() * 24}px;
      pointer-events: none;
      z-index: 1001;
      opacity: 0;
      animation: destructParticle ${0.8 + Math.random() * 0.8}s ease forwards;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    container.appendChild(particle);
    setTimeout(() => particle.remove(), 2000);
  }

  if (!document.getElementById('destruct-particle-style')) {
    const style = document.createElement('style');
    style.id = 'destruct-particle-style';
    style.textContent = `
      @keyframes destructParticle {
        0% { opacity: 0; transform: scale(0) translateY(0); }
        30% { opacity: 1; transform: scale(1.2) translateY(-20px); }
        100% { opacity: 0; transform: scale(0.5) translateY(-80px) rotate(180deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
