const horses = [
  document.getElementById('horse1'),
  document.getElementById('horse2'),
  document.getElementById('horse3'),
  document.getElementById('horse4'),
  document.getElementById('horse5')
];
const startBtn = document.getElementById('startBtn');
const winnerDiv = document.getElementById('winner');

function resetRace() {
  horses.forEach(horse => {
    horse.style.left = '0px';
  });
  winnerDiv.textContent = '';
}

function startRace() {
  resetRace();
  startBtn.disabled = true;
  const raceDuration = 45 + Math.random() * 15; // ~45–60s total time

  const intervals = horses.map((horse, index) => {
    return setInterval(() => {
      const currentLeft = parseFloat(horse.style.left) || 0;
      const delta = Math.random() * 10;
      horse.style.left = currentLeft + delta + 'px';

      // Win condition (arbitrary finish line at ~90% of container width)
      if (currentLeft + delta > window.innerWidth * 0.75) {
        winnerDiv.textContent = `🎉 ${horse.textContent} wins!`;
        intervals.forEach(clearInterval);
        startBtn.disabled = false;
      }
    }, 100);
  });
}

startBtn.addEventListener('click', startRace);
