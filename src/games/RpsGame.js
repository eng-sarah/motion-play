export default class RpsGame {
    constructor(container, tracker) {
        this.container = container;
        this.tracker = tracker;
        
        this.gameState = 'IDLE'; // IDLE, COUNTDOWN, RESULT
        this.currentMove = 0; // 0=None, 1=Rock, 2=Paper, 3=Scissors
        this.scores = [0, 0]; // [AI, Player]
        this.timeLeft = 3;
        
        this.MOVES = {
            1: { name: 'ROCK', icon: '✊' },
            2: { name: 'PAPER', icon: '✋' },
            3: { name: 'SCISSORS', icon: '✌️' }
        };

        this.initDOM();
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    initDOM() {
        this.dom = document.createElement('div');
        this.dom.className = 'rps-container';
        this.dom.style.width = '100%';
        this.dom.style.height = '100%';
        this.dom.style.display = 'flex';
        this.dom.style.flexDirection = 'column';
        this.dom.style.padding = '1rem';
        this.dom.style.paddingTop = '4rem'; // avoid nav back button
        
        this.dom.innerHTML = `
            <style>
                .rps-scores { display: flex; justify-content: space-between; margin-bottom: 1.5rem; font-size: 2rem; font-weight: 800; background: linear-gradient(to right, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; padding: 0 1rem; }
                .rps-arena { flex: 1; display: flex; flex-direction: column; gap: 1rem; position: relative; }
                .rps-panel { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden; box-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); backdrop-filter: blur(8px); min-height: 250px; }
                .rps-canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.5; transform: scaleX(-1); }
                .rps-icon { font-size: 6rem; z-index: 10; margin-top: auto; margin-bottom: auto; text-shadow: 0 0 20px rgba(255,255,255,0.8); transition: transform 0.3s; }
                .rps-panel.ai-side .rps-icon { transform: rotateY(180deg); }
                .rps-center-col { display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; padding: 1rem; border-radius: 20px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); }
                .rps-btn { padding: 1rem 2rem; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; border: none; border-radius: 30px; font-size: 1.2rem; font-weight: bold; font-family: inherit; cursor: pointer; box-shadow: 0 4px 15px rgba(236,72,153,0.5); width: 100%; max-width: 300px; transition: transform 0.2s, box-shadow 0.2s; }
                .rps-btn:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 20px rgba(236,72,153,0.7); }
                .rps-status { text-align: center; font-size: 1.5rem; margin-bottom: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
                .rps-badge { z-index: 10; font-weight: bold; position: absolute; top: 15px; background: rgba(0,0,0,0.6); padding: 5px 20px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.1); }

                @media (min-width: 768px) {
                    .rps-arena { flex-direction: row; align-items: stretch; }
                    .rps-center-col { flex: 0 0 250px; background: transparent; border: none; }
                    .rps-btn { width: 100%; }
                }
            </style>
            <div class="rps-scores">
                <div class="player-score">YOU: <span>0</span></div>
                <div class="ai-score">AI: <span>0</span></div>
            </div>
            
            <div class="rps-arena">
                <div class="rps-panel" id="rps-player-panel">
                    <canvas id="rps-canvas" class="rps-canvas"></canvas>
                    <div class="rps-badge">YOU: <span id="player-detect">None</span></div>
                    <div id="player-icon" class="rps-icon">❓</div>
                </div>
                
                <div class="rps-center-col">
                    <div class="rps-status" id="rps-center-status">WAITING...</div>
                    <button id="rps-btn" class="rps-btn">START MATCH</button>
                </div>
                
                <div class="rps-panel ai-side" id="rps-ai-panel">
                    <div class="rps-badge">AI TARGET</div>
                    <div id="ai-icon" class="rps-icon">🤖</div>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.dom);
        
        this.ui = {
            playerScore: this.dom.querySelector('.player-score span'),
            aiScore: this.dom.querySelector('.ai-score span'),
            canvas: this.dom.querySelector('#rps-canvas'),
            ctx: this.dom.querySelector('#rps-canvas').getContext('2d'),
            playerDetect: this.dom.querySelector('#player-detect'),
            playerIcon: this.dom.querySelector('#player-icon'),
            aiIcon: this.dom.querySelector('#ai-icon'),
            status: this.dom.querySelector('#rps-center-status'),
            btn: this.dom.querySelector('#rps-btn')
        };
        
        this.ui.btn.addEventListener('click', () => this.startMatch());
        
        // Setup Canvas
        const updateCanvasSize = () => {
            const panel = this.dom.querySelector('#rps-player-panel');
            this.ui.canvas.width = panel.clientWidth;
            this.ui.canvas.height = panel.clientHeight;
        };
        window.addEventListener('resize', updateCanvasSize);
        setTimeout(updateCanvasSize, 100);
    }
    
    startMatch() {
        if (this.gameState === 'COUNTDOWN') return;
        
        this.gameState = 'COUNTDOWN';
        this.timeLeft = 3;
        this.ui.btn.style.display = 'none';
        this.ui.playerIcon.innerText = '❓';
        this.ui.aiIcon.innerText = '🤖';
        this.ui.status.innerText = this.timeLeft;
        
        let shuffleInt = setInterval(() => {
            const r = Math.floor(Math.random() * 3) + 1;
            this.ui.aiIcon.innerText = this.MOVES[r].icon;
        }, 100);
        
        let countInt = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft > 0) {
                this.ui.status.innerText = this.timeLeft;
            } else {
                clearInterval(countInt);
                clearInterval(shuffleInt);
                this.resolveMatch();
            }
        }, 1000);
    }
    
    detectGesture(landmarks) {
        if (!landmarks) return 0;

        let fingersUp = 0;
        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];
        const upStatus = [false, false, false, false];

        for (let i = 0; i < 4; i++) {
            if (landmarks[tips[i]].y < landmarks[pips[i]].y) {
                fingersUp++;
                upStatus[i] = true;
            }
        }

        const isThumbOut = Math.abs(landmarks[4].x - landmarks[17].x) > Math.abs(landmarks[3].x - landmarks[17].x);
        if (isThumbOut) fingersUp++;

        if (upStatus[0] && upStatus[1] && !upStatus[2] && !upStatus[3]) {
            return 3; // Scissors
        } else if (fingersUp >= 4) {
            return 2; // Paper
        } else if (fingersUp <= 1) {
            return 1; // Rock
        }
        return 0; // Unknown
    }
    
    resolveMatch() {
        this.gameState = 'RESULT';
        
        if (this.currentMove === 0) {
            this.ui.status.innerText = "NO HAND DETECTED!";
            this.ui.status.style.color = "#ef4444";
        } else {
            const aiChoice = Math.floor(Math.random() * 3) + 1;
            this.ui.aiIcon.innerText = this.MOVES[aiChoice].icon;
            this.ui.playerIcon.innerText = this.MOVES[this.currentMove].icon;
            
            if (this.currentMove === aiChoice) {
                this.ui.status.innerText = "DRAW!";
                this.ui.status.style.color = "#fcd34d";
            } else if (
                (this.currentMove === 1 && aiChoice === 3) ||
                (this.currentMove === 2 && aiChoice === 1) ||
                (this.currentMove === 3 && aiChoice === 2)
            ) {
                this.ui.status.innerText = "YOU WIN!";
                this.ui.status.style.color = "#10b981";
                this.scores[1]++;
                this.ui.playerScore.innerText = this.scores[1];
            } else {
                this.ui.status.innerText = "YOU LOSE!";
                this.ui.status.style.color = "#ef4444";
                this.scores[0]++;
                this.ui.aiScore.innerText = this.scores[0];
            }
        }
        
        setTimeout(() => {
            this.ui.btn.style.display = 'block';
            this.ui.btn.innerText = 'PLAY AGAIN';
            this.gameState = 'IDLE';
        }, 1500);
    }
    
    start() {
        this.loopId = requestAnimationFrame(this.gameLoop);
    }
    
    gameLoop() {
        if (!this.dom.isConnected) return;
        
        const cw = this.ui.canvas.width;
        const ch = this.ui.canvas.height;
        this.ui.ctx.clearRect(0, 0, cw, ch);
        
        const video = this.tracker.getVideo();
        if (video && video.readyState >= 2) {
            // Fill strategy
            this.ui.ctx.drawImage(video, 0, 0, cw, ch);
        }
        
        const landmarks = this.tracker.getLandmarks();
        if (landmarks) {
            // Draw skeleton
            this.ui.ctx.fillStyle = "#00f3ff";
            for (const pt of landmarks) {
                this.ui.ctx.beginPath();
                this.ui.ctx.arc(pt.x * cw, pt.y * ch, 4, 0, Math.PI*2);
                this.ui.ctx.fill();
            }
            this.currentMove = this.detectGesture(landmarks);
            if (this.currentMove) {
                this.ui.playerDetect.innerText = this.MOVES[this.currentMove].name;
            } else {
                this.ui.playerDetect.innerText = "Unknown";
            }
        } else {
            this.currentMove = 0;
            this.ui.playerDetect.innerText = "None";
        }
        
        this.loopId = requestAnimationFrame(this.gameLoop);
    }
    
    destroy() {
        cancelAnimationFrame(this.loopId);
        this.container.innerHTML = '';
    }
}
