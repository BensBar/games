let mascots = [];
let startBtn;
let winnerDiv;
let countdownDiv;
let raceDurationSelect;

let raceActive = false;
let raceIntervals = [];

function initializeMascots() {
  mascots = [
    { element: document.getElementById('mascot1'), name: 'Hairy Dawg', team: 'Dawgs' },
    { element: document.getElementById('mascot2'), name: 'Freddy Falcon', team: 'Falcons' },
    { element: document.getElementById('mascot3'), name: 'Blooper', team: 'Braves' },
    { element: document.getElementById('mascot4'), name: 'Billy Buffalo', team: 'Bills' },
    { element: document.getElementById('mascot5'), name: 'T-Rac', team: 'Titans' }
  ];
  
  startBtn = document.getElementById('startBtn');
  winnerDiv = document.getElementById('winner');
  countdownDiv = document.getElementById('countdown');
  raceDurationSelect = document.getElementById('raceDuration');
}

// Last 5 Winners functionality
function loadLastWinners() {
  try {
    const winners = localStorage.getItem('mascot-racing-winners');
    return winners ? JSON.parse(winners) : [];
  } catch (error) {
    console.warn('Failed to load winners from localStorage:', error);
    return [];
  }
}

function saveWinner(winner) {
  try {
    const winners = loadLastWinners();
    const newWinner = {
      name: winner.name,
      team: winner.team,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Add to front of array and keep only last 5
    winners.unshift(newWinner);
    winners.splice(5);
    
    localStorage.setItem('mascot-racing-winners', JSON.stringify(winners));
    displayLastWinners();
  } catch (error) {
    console.warn('Failed to save winner to localStorage:', error);
  }
}

function displayLastWinners() {
  const winners = loadLastWinners();
  const winnersList = document.getElementById('winners-list');
  
  if (winners.length === 0) {
    winnersList.innerHTML = '<div class="no-winners">No races completed yet</div>';
    return;
  }
  
  winnersList.innerHTML = winners.map((winner, index) => `
    <div class="winner-item">
      <div class="winner-info">
        <div class="winner-rank">${index + 1}</div>
        <div>
          <div class="winner-name">${winner.name}</div>
          <div class="winner-team">Team: ${winner.team}</div>
        </div>
      </div>
      <div class="winner-time">${winner.time}</div>
    </div>
  `).join('');
}

function resetRace() {
  mascots.forEach(mascot => {
    mascot.element.style.left = '0px';
    mascot.element.classList.remove('racing', 'winner', 'speed-burst');
  });
  winnerDiv.textContent = '';
  winnerDiv.classList.remove('winner-animation');
  countdownDiv.textContent = '';
  
  // Clear any existing intervals
  raceIntervals.forEach(interval => clearInterval(interval));
  raceIntervals = [];
  raceActive = false;
  
  // Close winner overlay if open
  const overlay = document.getElementById('winner-overlay');
  overlay.classList.remove('show');
  
  // Clean up celebration effects
  const finishLine = document.querySelector('.finish-line');
  finishLine.classList.remove('celebrating');
  
  // Clean up confetti and sparkles
  const confetti = document.querySelectorAll('.confetti');
  confetti.forEach(piece => piece.remove());
  
  const sparkles = document.querySelectorAll('.finish-sparkle');
  sparkles.forEach(sparkle => sparkle.remove());
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
        
        // Add occasional speed bursts for dramatic effect
        if (Math.random() < 0.15) { // 15% chance per interval
          addSpeedBurstEffect(mascot);
        }
        
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
  // Add winner class to the winning mascot for enhanced highlighting
  winner.element.classList.add('winner');
  
  // Traditional winner announcement (kept for compatibility)
  winnerDiv.innerHTML = `
    <div class="winner-animation">
      🎉 ${winner.name} wins! 🎉
      <br>
      <small>Team: ${winner.team}</small>
    </div>
  `;
  winnerDiv.classList.add('winner-animation');
  
  // Trigger finish line celebration
  triggerFinishLineCelebration();
  
  // Show dramatic winner overlay after a short delay
  setTimeout(() => {
    showWinnerOverlay(winner);
  }, 1000);
  
  // Save the winner to localStorage
  saveWinner(winner);
}

// New function to show the dramatic winner overlay
function showWinnerOverlay(winner) {
  const overlay = document.getElementById('winner-overlay');
  const overlayWinnerName = document.getElementById('overlay-winner-name');
  const overlayWinnerTeam = document.getElementById('overlay-winner-team');
  
  overlayWinnerName.textContent = `${winner.name} Wins!`;
  overlayWinnerTeam.textContent = `Team: ${winner.team}`;
  
  overlay.classList.add('show');
  
  // Create confetti effect
  createConfetti();
}

// Function to close the winner overlay
function closeWinnerOverlay() {
  const overlay = document.getElementById('winner-overlay');
  overlay.classList.remove('show');
  
  // Remove winner highlighting from mascots
  mascots.forEach(mascot => {
    mascot.element.classList.remove('winner');
  });
  
  // Remove finish line celebration
  const finishLine = document.querySelector('.finish-line');
  finishLine.classList.remove('celebrating');
  
  // Clean up any remaining confetti
  const confetti = document.querySelectorAll('.confetti');
  confetti.forEach(piece => piece.remove());
  
  // Clean up sparkles
  const sparkles = document.querySelectorAll('.finish-sparkle');
  sparkles.forEach(sparkle => sparkle.remove());
}

// Function to create confetti effect
function createConfetti() {
  const colors = ['#ffd700', '#ffaa00', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
  
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      document.body.appendChild(confetti);
      
      // Remove confetti after animation
      setTimeout(() => {
        confetti.remove();
      }, 3500);
    }, i * 50);
  }
}

// Function to trigger finish line celebration effects
function triggerFinishLineCelebration() {
  const finishLine = document.querySelector('.finish-line');
  finishLine.classList.add('celebrating');
  
  // Create sparkle effects around the finish line
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      createFinishLineSparkle();
    }, i * 100);
  }
}

// Function to create sparkle effects at the finish line
function createFinishLineSparkle() {
  const finishLine = document.querySelector('.finish-line');
  const sparkle = document.createElement('div');
  sparkle.className = 'finish-sparkle';
  
  // Position sparkles around the finish line
  const rect = finishLine.getBoundingClientRect();
  sparkle.style.left = (rect.left + Math.random() * rect.width - 20) + 'px';
  sparkle.style.top = (rect.top + Math.random() * rect.height) + 'px';
  
  document.body.appendChild(sparkle);
  
  // Remove sparkle after animation
  setTimeout(() => {
    sparkle.remove();
  }, 1500);
}

// Enhanced racing with speed burst effects
function addSpeedBurstEffect(mascot) {
  mascot.element.classList.add('speed-burst');
  setTimeout(() => {
    mascot.element.classList.remove('speed-burst');
  }, 300);
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
  initializeMascots();
  resetRace();
  displayLastWinners();
  
  // Set up event listeners
  startBtn.addEventListener('click', startRace);
});

// Handle window resize to recalculate finish position
window.addEventListener('resize', () => {
  if (!raceActive) {
    resetRace();
  }
});

// Make closeWinnerOverlay globally available
window.closeWinnerOverlay = closeWinnerOverlay;
