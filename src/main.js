import { handTracker } from './core/HandTracker.js';
import BalloonGame from './games/BalloonGame.js';
import RpsGame from './games/RpsGame.js';
import SnakeGame from './games/SnakeGame.js';

const ui = {
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    statusText: document.getElementById('system-status'),
    navBack: document.getElementById('nav-back'),
    hubView: document.getElementById('hub-view'),
    activeView: document.getElementById('active-game-view'),
    cards: document.querySelectorAll('.game-card'),
    cameraToggle: document.getElementById('camera-toggle')
};

let currentGameInstance = null;

// Hand Tracker Status Updates
handTracker.onStatusChange((msg) => {
    ui.loadingText.innerText = msg;
    ui.statusText.innerText = msg;
    ui.statusText.classList.remove('hidden');
    clearTimeout(ui.statusText.timeout);
    ui.statusText.timeout = setTimeout(() => {
        ui.statusText.classList.add('hidden');
    }, 3000);
});

// App Initialization
async function initApp() {
    try {
        await handTracker.initialize();
        // Delay dismissing loader so user perceives readiness
        setTimeout(() => {
            ui.loadingOverlay.classList.add('hidden');
        }, 500);
    } catch(err) {
        ui.loadingText.innerText = "Fatal Error: Camera Required to Play.";
        console.error(err);
    }
}

// Navigation Handlers
async function launchGame(gameId) {
    if (!cameraActive) {
        try {
            ui.statusText.innerText = "Requesting Camera...";
            ui.statusText.classList.remove('hidden');
            await handTracker.startCamera();
            cameraActive = true;
            ui.cameraToggle.classList.remove('off');
            ui.cameraToggle.innerText = '📹';
            ui.statusText.classList.add('hidden');
        } catch(e) {
            console.error("Camera Start Failed:", e);
            alert("Camera is required to play.");
            return;
        }
    }

    ui.hubView.classList.add('hidden');
    ui.activeView.classList.remove('hidden');
    ui.navBack.classList.remove('hidden');
    
    // Cleanup previous container
    ui.activeView.innerHTML = '';
    
    // Start tracking globally
    handTracker.startTracking();

    switch(gameId) {
        case 'balloon':
            currentGameInstance = new BalloonGame(ui.activeView, handTracker);
            break;
        case 'rps':
            currentGameInstance = new RpsGame(ui.activeView, handTracker);
            break;
        case 'snake':
            currentGameInstance = new SnakeGame(ui.activeView, handTracker);
            break;
    }
    
    if (currentGameInstance) {
        currentGameInstance.start();
    }
}

function stopCurrentGame() {
    if (currentGameInstance) {
        currentGameInstance.destroy();
        currentGameInstance = null;
    }
    handTracker.stopTracking(); // Save battery
    
    ui.activeView.innerHTML = ''; // Wipe DOM
    ui.activeView.classList.add('hidden');
    ui.hubView.classList.remove('hidden');
    ui.navBack.classList.add('hidden');
}

// Event Listeners
ui.cards.forEach(card => {
    card.addEventListener('click', () => {
        launchGame(card.dataset.game);
    });
});

ui.navBack.addEventListener('click', stopCurrentGame);

let cameraActive = true;
ui.cameraToggle.addEventListener('click', async () => {
    if (cameraActive) {
        handTracker.stopCamera();
        cameraActive = false;
        ui.cameraToggle.classList.add('off');
        ui.cameraToggle.innerText = '🚫';
        if (currentGameInstance) {
            stopCurrentGame();
        }
    } else {
        try {
            await handTracker.startCamera();
            cameraActive = true;
            ui.cameraToggle.classList.remove('off');
            ui.cameraToggle.innerText = '📹';
        } catch (e) {
            console.error("Camera Start Failed:", e);
        }
    }
});

// Boot
initApp();
