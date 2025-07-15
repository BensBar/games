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
  
  // Save the winner to localStorage
  saveWinner(winner);
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
