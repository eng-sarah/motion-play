export default class BalloonGame {
    constructor(container, tracker) {
        this.container = container;
        this.tracker = tracker;
        
        // Settings
        this.WIN_W = window.innerWidth;
        this.WIN_H = window.innerHeight;
        this.BALLOON_MIN_R = 25;
        this.BALLOON_MAX_R = 50;
        this.BALLOON_SPAWN_RATE = 20; // frames
        this.FINGERTIP_RADIUS = 15;
        this.GAME_TIME = 60;
        this.COLORS = ["#ff6347", "#ffd700", "#32cd32", "#4682b4", "#c71585", "#8a2be2"];
        
        // State
        this.balloons = [];
        this.particles = [];
        this.popups = [];
        this.frameCounter = 0;
        this.score = 0;
        this.gameOver = false;
        
        this.haveLast = false;
        this.lastIx = 0;
        this.lastIy = 0;
        this.roundStartMs = 0;
        
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.loopId = null;

        this.initDOM();
        
        // Bindings
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }
    
    initDOM() {
        this.dom = document.createElement('div');
        this.dom.style.position = 'absolute';
        this.dom.style.inset = '0';
        this.dom.style.overflow = 'hidden';
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.inset = '0';
        this.canvas.width = this.WIN_W;
        this.canvas.height = this.WIN_H;
        this.ctx = this.canvas.getContext('2d');
        
        this.uiLayer = document.createElement('div');
        this.uiLayer.style.position = 'absolute';
        this.uiLayer.style.top = '1rem';
        this.uiLayer.style.right = '1rem';
        this.uiLayer.style.display = 'flex';
        this.uiLayer.style.flexDirection = 'column';
        this.uiLayer.style.gap = '0.5rem';
        this.uiLayer.style.textAlign = 'right';
        this.uiLayer.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
        this.uiLayer.style.pointerEvents = 'none';
        
        this.scoreEl = document.createElement('h2');
        this.scoreEl.innerText = "Score: 0";
        this.scoreEl.style.color = "#fff";
        this.scoreEl.style.margin = "0";
        
        this.timeEl = document.createElement('h3');
        this.timeEl.innerText = "Time: 60s";
        this.timeEl.style.color = "#fbbf24";
        this.timeEl.style.margin = "0";
        
        this.uiLayer.appendChild(this.scoreEl);
        this.uiLayer.appendChild(this.timeEl);
        
        this.gameOverOverlay = document.createElement('div');
        this.gameOverOverlay.style.position = 'absolute';
        this.gameOverOverlay.style.inset = '0';
        this.gameOverOverlay.style.background = 'rgba(0,0,0,0.8)';
        this.gameOverOverlay.style.display = 'flex';
        this.gameOverOverlay.style.flexDirection = 'column';
        this.gameOverOverlay.style.alignItems = 'center';
        this.gameOverOverlay.style.justifyContent = 'center';
        this.gameOverOverlay.style.color = 'white';
        this.gameOverOverlay.style.display = 'none';
        this.gameOverOverlay.innerHTML = `
            <h1 style="font-size:3rem; margin-bottom:1rem; background: linear-gradient(to right, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">TIME'S UP!</h1>
            <h2 class="final-score" style="font-size:2rem; margin-bottom:2rem;">Score: 0</h2>
            <button class="retry-btn" style="padding:1rem 2rem; border-radius:30px; border:none; background:var(--primary); color:white; font-size:1.2rem; cursor:pointer; box-shadow:0 4px 15px rgba(139,92,246,0.5); font-family:inherit; font-weight:bold;">PLAY AGAIN</button>
        `;
        
        this.gameOverOverlay.querySelector('.retry-btn').addEventListener('click', () => {
            this.resetGame();
        });

        this.dom.appendChild(this.canvas);
        this.dom.appendChild(this.uiLayer);
        this.dom.appendChild(this.gameOverOverlay);
        this.container.appendChild(this.dom);
    }
    
    handleResize() {
        this.WIN_W = this.container.clientWidth || window.innerWidth;
        this.WIN_H = this.container.clientHeight || window.innerHeight;
        this.canvas.width = this.WIN_W;
        this.canvas.height = this.WIN_H;
    }

    playPopSound() {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
    }

    spawnBalloon() {
        let r = this.BALLOON_MIN_R + Math.random() * (this.BALLOON_MAX_R - this.BALLOON_MIN_R);
        let x = r + 10 + Math.random() * (this.WIN_W - 2 * r - 20);
        let y = this.WIN_H + r + 20;
        let vy = -(2 + Math.random() * 3);
        let colorUrl = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
        this.balloons.push({x, y, r, color: colorUrl, vy});
    }

    drawBalloon(b) {
        let rx = b.r * 0.90, ry = b.r * 1.25;
        this.ctx.save();
        this.ctx.fillStyle = b.color;
        this.ctx.beginPath();
        this.ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
        this.ctx.stroke();

        let shineW = rx * 0.5, shineH = ry * 0.35;
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        this.ctx.beginPath();
        this.ctx.ellipse(b.x - rx * 0.45, b.y - ry * 0.45, shineW / 2, shineH / 2, -Math.PI/6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    ellipseHit(ix, iy, bx, by, r) {
        let rx = r * 0.90 + this.FINGERTIP_RADIUS;
        let ry = r * 1.25 + this.FINGERTIP_RADIUS;
        let dx = ix - bx, dy = iy - by;
        return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0;
    }

    start() {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this.handleResize();
        this.resetGame();
        this.loopId = requestAnimationFrame(this.gameLoop);
    }

    resetGame() {
        this.balloons = [];
        this.particles = [];
        this.popups = [];
        this.frameCounter = 0;
        this.score = 0;
        this.gameOver = false;
        this.haveLast = false;
        this.roundStartMs = performance.now();
        this.scoreEl.innerText = `Score: 0`;
        this.gameOverOverlay.style.display = 'none';
    }

    gameLoop() {
        if (this.gameOver) return;
        
        this.ctx.clearRect(0, 0, this.WIN_W, this.WIN_H);
        
        let elapsed = performance.now() - this.roundStartMs;
        let rem = Math.max(0, this.GAME_TIME - Math.floor(elapsed / 1000));
        this.timeEl.innerText = `Time: ${rem}s`;
        
        if (rem <= 0) {
            this.gameOver = true;
            this.gameOverOverlay.style.display = 'flex';
            this.gameOverOverlay.querySelector('.final-score').innerText = `Score: ${this.score}`;
            return;
        }

        // Camera Background
        const video = this.tracker.getVideo();
        let drawX = 0, drawY = 0, drawW = this.WIN_W, drawH = this.WIN_H;
        if (video && video.readyState >= 2) {
            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = this.WIN_W / this.WIN_H;
            if (canvasRatio > videoRatio) {
                drawW = this.WIN_W;
                drawH = this.WIN_W / videoRatio;
                drawY = (this.WIN_H - drawH) / 2;
            } else {
                drawH = this.WIN_H;
                drawW = this.WIN_H * videoRatio;
                drawX = (this.WIN_W - drawW) / 2;
            }
            this.ctx.save();
            this.ctx.translate(this.WIN_W, 0);
            this.ctx.scale(-1, 1);
            this.ctx.globalAlpha = 0.5;
            this.ctx.drawImage(video, drawX, drawY, drawW, drawH);
            this.ctx.restore();
        }

        // Logic
        this.frameCounter++;
        if (this.frameCounter % this.BALLOON_SPAWN_RATE === 0) this.spawnBalloon();

        const landmarks = this.tracker.getLandmarks();
        let fingertipPresent = false;
        let ix = 0, iy = 0;
        
        if (landmarks) {
            // Index finger tip (point 8)
            let tx = drawX + (1 - landmarks[8].x) * drawW;
            let ty = drawY + landmarks[8].y * drawH;
            
            ix = this.haveLast ? (0.6 * tx + 0.4 * this.lastIx) : tx;
            iy = this.haveLast ? (0.6 * ty + 0.4 * this.lastIy) : ty;
            
            this.lastIx = ix;
            this.lastIy = iy;
            this.haveLast = true;
            fingertipPresent = true;
        } else {
            this.haveLast = false;
        }

        // Draw and update balloons
        for (let i = this.balloons.length - 1; i >= 0; i--) {
            let b = this.balloons[i];
            b.y += b.vy;
            if (b.y + b.r < -10) {
                this.balloons.splice(i, 1);
                continue;
            }
            
            if (fingertipPresent && this.ellipseHit(ix, iy, b.x, b.y, b.r)) {
                this.balloons.splice(i, 1);
                this.score++;
                this.scoreEl.innerText = `Score: ${this.score}`;
                this.playPopSound();
                // Spawn simple visual explosion
                this.popups.push({ x: b.x, y: b.y, life: 30 });
            } else {
                this.drawBalloon(b);
            }
        }

        // Simple popups
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 24px var(--font-main)";
        for (let i = this.popups.length - 1; i >= 0; i--) {
            let p = this.popups[i];
            p.y -= 1;
            p.life--;
            this.ctx.save();
            this.ctx.globalAlpha = p.life / 30;
            this.ctx.fillText("+1", p.x, p.y);
            this.ctx.restore();
            if (p.life <= 0) this.popups.splice(i, 1);
        }

        // Draw Tracker Dot
        if (fingertipPresent) {
            this.ctx.beginPath();
            this.ctx.arc(ix, iy, this.FINGERTIP_RADIUS, 0, Math.PI * 2);
            this.ctx.fillStyle = "#fbbf24";
            this.ctx.fill();
            this.ctx.strokeStyle = "#fff";
            this.ctx.stroke();
        } else {
            this.ctx.fillStyle = "rgba(255,255,255,0.7)";
            this.ctx.font = "1rem var(--font-main)";
            this.ctx.fillText("Show index finger to play", 20, this.WIN_H - 20);
        }

        this.loopId = requestAnimationFrame(this.gameLoop);
    }

    destroy() {
        this.gameOver = true;
        cancelAnimationFrame(this.loopId);
        window.removeEventListener('resize', this.handleResize);
        if (this.audioCtx) this.audioCtx.close();
        this.container.innerHTML = '';
    }
}
