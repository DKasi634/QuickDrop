import confetti from 'canvas-confetti';

export function triggerConfetti(): void {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa'],
      ticks: 120,
      gravity: 1.2,
      scalar: 0.9,
      shapes: ['circle', 'square'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#818cf8', '#f472b6', '#34d399'],
        ticks: 100,
      });
    }, 150);

    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#fbbf24', '#a78bfa', '#f472b6'],
        ticks: 100,
      });
    }, 300);
  } catch (err) {
    console.warn('Confetti animation failed:', err);
  }
}

export function triggerSparkle(element: HTMLElement): void {
  const sparkleCount = 6;
  const rect = element.getBoundingClientRect();

  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.textContent = '✨';
    sparkle.style.cssText = `
      position: fixed;
      left: ${rect.left + Math.random() * rect.width}px;
      top: ${rect.top + Math.random() * rect.height}px;
      font-size: ${8 + Math.random() * 12}px;
      pointer-events: none;
      z-index: 9999;
      animation: sparkle 0.8s ease forwards;
      animation-delay: ${i * 0.1}s;
    `;
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1200);
  }
}

export function triggerShake(element: HTMLElement): void {
  element.classList.add('shake');
  element.addEventListener('animationend', () => {
    element.classList.remove('shake');
  }, { once: true });
}

export function animateNumber(
  element: HTMLElement,
  target: number,
  duration = 600
): void {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    element.textContent = current.toString();
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}
