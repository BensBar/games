const mascots = [
  { element: document.getElementById('mascot1'), name: 'Hairy Dawg', team: 'Dawgs' },
  { element: document.getElementById('mascot2'), name: 'Freddy Falcon', team: 'Falcons' },
  { element: document.getElementById('mascot3'), name: 'Blooper', team: 'Braves' },
  { element: document.getElementById('mascot4'), name: 'Billy Buffalo', team: 'Bills' },
  { element: document.getElementById('mascot5'), name: 'T-Rac', team: 'Titans' }
];

const startBtn = document.getElementById('startBtn');
const winnerDiv = document.getElementById('winner');
const countdownDiv = document.getElementById('countdown');
const raceDurationSelect = document.getElementById('raceDuration');

let raceActive = false;
let raceIntervals = [];

function resetRace() {
  mascots.forEach(mascot => {
    mascot.element.style.left = '0px';
    mascot.element.classList.remove('racing');
  });
  winnerDiv.textContent = '';
  winnerDiv.classList.remove('winner-animation');
  countdownDiv.textContent = '';
  
  // Clear any existing intervals
  raceIntervals.forEach(interval => clearInterval(interval));
  raceIntervals = [];
  raceActive = false;
}

function startCountdown() {
  return new Promise((resolve) => {
    let count = 3;
    countdownDiv.textContent = count;
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownDiv.textContent = count;
      } else if (count === 0) {
        countdownDiv.textContent = 'GO!';
      } else {
        countdownDiv.textContent = '';
        clearInterval(countdownInterval);
        resolve();
      }
    }, 1000);
  });
}

function getFinishLinePosition() {
  const track = document.getElementById('track');
  const trackWidth = track.offsetWidth;
  const finishLineOffset = 60; // Account for finish line position
  return trackWidth - finishLineOffset - 100; // Leave some space for mascot width
}

function startRace() {
  resetRace();
  startBtn.disabled = true;
  
  // Start countdown
  startCountdown().then(() => {
    raceActive = true;
    const selectedDuration = parseInt(raceDurationSelect.value);
    const finishPosition = getFinishLinePosition();
    
    // Add racing animation class
    mascots.forEach(mascot => {
      mascot.element.classList.add('racing');
    });
    
    // Calculate movement speed based on duration
    const baseSpeed = finishPosition / (selectedDuration * 10); // 10 intervals per second
    
    mascots.forEach((mascot, index) => {
      const interval = setInterval(() => {
        if (!raceActive) {
          clearInterval(interval);
          return;
        }
        
        const currentLeft = parseFloat(mascot.element.style.left) || 0;
        // Add randomization to make race interesting
        const speedVariation = 0.7 + Math.random() * 0.6; // 70% to 130% of base speed
        const delta = baseSpeed * speedVariation;
        const newPosition = currentLeft + delta;
        
        mascot.element.style.left = newPosition + 'px';
        
        // Check win condition
        if (newPosition >= finishPosition) {
          raceActive = false;
          announceWinner(mascot);
          
          // Clear all intervals
          raceIntervals.forEach(interval => clearInterval(interval));
          raceIntervals = [];
          
          // Remove racing animation from all mascots
          mascots.forEach(m => m.element.classList.remove('racing'));
          
          startBtn.disabled = false;
        }
      }, 100);
      
      raceIntervals.push(interval);
    });
  });
}

function announceWinner(winner) {
  winnerDiv.innerHTML = `
    <div class="winner-animation">
      🎉 ${winner.name} wins! 🎉
      <br>
      <small>Team: ${winner.team}</small>
    </div>
  `;
  winnerDiv.classList.add('winner-animation');
}

// Add image loading fallback
function setupImageFallbacks() {
  mascots.forEach((mascot, index) => {
    const img = mascot.element.querySelector('img');
    img.onerror = function() {
      console.warn(`Failed to load mascot${index + 1}.png, using fallback`);
      this.style.display = 'none';
      
      // Create fallback emoji
      const fallbackEmoji = document.createElement('span');
      fallbackEmoji.style.fontSize = '40px';
      fallbackEmoji.style.marginRight = '10px';
      
      // Use different emojis for each mascot
      const emojis = ['🦅', '🦬', '⚡', '🐕', '⚾'];
      fallbackEmoji.textContent = emojis[index];
      
      this.parentNode.insertBefore(fallbackEmoji, this);
    };
  });
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
  setupImageFallbacks();
  resetRace();
});

startBtn.addEventListener('click', startRace);

// Handle window resize to recalculate finish position
window.addEventListener('resize', () => {
  if (!raceActive) {
    resetRace();
  }
});
