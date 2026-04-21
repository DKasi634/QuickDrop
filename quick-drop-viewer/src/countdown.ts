let countdownInterval: ReturnType<typeof setInterval> | null = null;

export function startCountdown(expiresAt: string): void {
  const countdownEl = document.getElementById('viewer-countdown');
  if (!countdownEl) return;

  const expiryTime = new Date(expiresAt).getTime();

  function update() {
    const now = Date.now();
    const diff = expiryTime - now;

    if (diff <= 0) {
      countdownEl!.innerHTML = '⏱ <span>Expired</span>';
      countdownEl!.classList.add('urgent');
      if (countdownInterval) clearInterval(countdownInterval);
      setTimeout(() => window.location.reload(), 2000);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let timeStr = '';
    if (days > 0) timeStr = `${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) timeStr = `${hours}h ${minutes}m ${seconds}s`;
    else if (minutes > 0) timeStr = `${minutes}m ${seconds}s`;
    else timeStr = `${seconds}s`;

    countdownEl!.innerHTML = `⏱ <span>${timeStr} remaining</span>`;

    if (diff < 5 * 60 * 1000) {
      countdownEl!.classList.add('urgent');
    } else {
      countdownEl!.classList.remove('urgent');
    }
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

export function stopCountdown(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}
