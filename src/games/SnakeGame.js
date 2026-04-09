export default class SnakeGame {
    constructor(container, tracker) {
        this.container = container;
        this.tracker = tracker;

        this.WIN_W = window.innerWidth;
        this.WIN_H = window.innerHeight;
        
        this.SNAKE_RADIUS = 15;
        this.FOOD_RADIUS = 15;
        this.TAIL_SPACING = 15;
        
        this.snake = [{x: this.WIN_W/2, y: this.WIN_H/2}];
        this.tailLength = 5;
        this.food = this.spawnFood();
        
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        
        this.initDOM();
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }
    
    handleResize() {
        this.WIN_W = this.container.clientWidth || window.innerWidth;
        this.WIN_H = this.container.clientHeight || window.innerHeight;
        if(this.ui) {
            this.ui.canvas.width = this.WIN_W;
            this.ui.canvas.height = this.WIN_H;
        }
    }
    
    initDOM() {
        this.dom = document.createElement('div');
        this.dom.style.position = 'absolute';
        this.dom.style.inset = '0';
        this.dom.style.overflow = 'hidden';
        this.dom.style.background = '#0ea5e9'; // retro color
        
        this.dom.innerHTML = `
            <canvas id="snake-canvas" style="position:absolute; inset:0;"></canvas>
            <div style="position:absolute; top: 1rem; right: 1rem; font-size: 2rem; font-weight: bold; color: white; text-shadow: 2px 2px 0 #000;">
                SCORE: <span id="snake-score">0</span>
            </div>
            <div id="snake-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.7); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white;">
                <h1 style="font-size:3rem; margin-bottom:1rem; color:#facc15;">HAND SNAKE</h1>
                <p>Pinch or point your index finger to guide the snake!</p>
                <h2 id="snake-final" style="display:none; font-size: 2rem; color: #f87171; margin-top:1rem;">CRASHED!</h2>
                <button id="snake-start" style="margin-top:2rem; padding: 1rem 3rem; font-size:1.5rem; font-weight:bold; border-radius:30px; border:none; background:#22c55e; color:white; cursor:pointer;">PLAY</button>
            </div>
        `;
        
        this.container.appendChild(this.dom);
        this.ui = {
            canvas: this.dom.querySelector('#snake-canvas'),
            ctx: this.dom.querySelector('#snake-canvas').getContext('2d'),
            score: this.dom.querySelector('#snake-score'),
            overlay: this.dom.querySelector('#snake-overlay'),
            final: this.dom.querySelector('#snake-final'),
            startBtn: this.dom.querySelector('#snake-start')
        };
        
        this.handleResize();
        this.ui.startBtn.addEventListener('click', () => this.startGame());
    }
    
    spawnFood() {
        const margin = 50;
        return {
            x: margin + Math.random() * (this.WIN_W - margin * 2),
            y: margin + Math.random() * (this.WIN_H - margin * 2)
        };
    }
    
    startGame() {
        this.snake = [{x: this.WIN_W/2, y: this.WIN_H/2}];
        for(let i=1; i<this.tailLength; i++) {
            this.snake.push({...this.snake[0]});
        }
        this.tailLength = 5;
        this.score = 0;
        this.ui.score.innerText = '0';
        this.food = this.spawnFood();
        this.gameOver = false;
        this.gameStarted = true;
        this.ui.overlay.style.display = 'none';
        this.ui.final.style.display = 'none';
    }
    
    start() {
        this.loopId = requestAnimationFrame(this.gameLoop);
    }
    
    gameLoop() {
        if (!this.dom.isConnected) return;
        
        this.ui.ctx.clearRect(0, 0, this.WIN_W, this.WIN_H);
        
        // Draw Webcam Background
        const video = this.tracker.getVideo();
        if (video && video.readyState >= 2) {
            this.ui.ctx.save();
            this.ui.ctx.translate(this.WIN_W, 0);
            this.ui.ctx.scale(-1, 1);
            this.ui.ctx.globalAlpha = 0.3;
            // object-fit cover
            const vr = video.videoWidth / video.videoHeight;
            const cr = this.WIN_W / this.WIN_H;
            let dw = this.WIN_W, dh = this.WIN_H, dx = 0, dy = 0;
            if (cr > vr) {
                dh = this.WIN_W / vr; dy = (this.WIN_H - dh) / 2;
            } else {
                dw = this.WIN_H * vr; dx = (this.WIN_W - dw) / 2;
            }
            this.ui.ctx.drawImage(video, dx, dy, dw, dh);
            this.ui.ctx.restore();
        }
        
        if (this.gameStarted && !this.gameOver) {
            const landmarks = this.tracker.getLandmarks();
            let targetX = this.snake[0].x;
            let targetY = this.snake[0].y;
            
            if (landmarks) {
                // Use index tip (8)
                const cr = this.WIN_W / this.WIN_H;
                const vr = 640 / 480; 
                let dw = this.WIN_W, dh = this.WIN_H, dx = 0, dy = 0;
                if (cr > vr) {
                    dh = this.WIN_W / vr; dy = (this.WIN_H - dh) / 2;
                } else {
                    dw = this.WIN_H * vr; dx = (this.WIN_W - dw) / 2;
                }
                
                let tx = dx + (1 - landmarks[8].x) * dw;
                let ty = dy + landmarks[8].y * dh;
                // smooth transition
                targetX = targetX + (tx - targetX) * 0.2;
                targetY = targetY + (ty - targetY) * 0.2;
            }
            
            // Move Head
            this.snake.unshift({x: targetX, y: targetY});
            
            // Collect Food
            const head = this.snake[0];
            const dx = head.x - this.food.x;
            const dy = head.y - this.food.y;
            if (Math.sqrt(dx*dx + dy*dy) < this.SNAKE_RADIUS + this.FOOD_RADIUS) {
                this.score += 10;
                this.ui.score.innerText = this.score;
                this.tailLength += 3;
                this.food = this.spawnFood();
            }
            
            while(this.snake.length > this.tailLength) {
                this.snake.pop();
            }
            
            // Self Collision checks (only if length > 10 and we check points spaced out)
            if (this.snake.length > 20) {
                for (let i = 20; i < this.snake.length; i+=2) {
                    let part = this.snake[i];
                    let ddx = head.x - part.x;
                    let ddy = head.y - part.y;
                    if (Math.sqrt(ddx*ddx + ddy*ddy) < this.SNAKE_RADIUS) {
                        this.gameOver = true;
                        this.ui.overlay.style.display = 'flex';
                        this.ui.final.style.display = 'block';
                        this.ui.startBtn.innerText = 'RETRY';
                        break;
                    }
                }
            }
        }
        
        // Draw Food
        this.ui.ctx.fillStyle = '#ef4444'; // Apple red
        this.ui.ctx.beginPath();
        this.ui.ctx.arc(this.food.x, this.food.y, this.FOOD_RADIUS, 0, Math.PI*2);
        this.ui.ctx.fill();
        this.ui.ctx.strokeStyle = '#991b1b';
        this.ui.ctx.lineWidth = 3;
        this.ui.ctx.stroke();
        
        // Draw Snake
        if (this.snake.length > 0) {
            // Body ribbon
            this.ui.ctx.beginPath();
            this.ui.ctx.moveTo(this.snake[0].x, this.snake[0].y);
            for (let i = 1; i < this.snake.length; i++) {
                this.ui.ctx.lineTo(this.snake[i].x, this.snake[i].y);
            }
            this.ui.ctx.strokeStyle = '#22c55e';
            this.ui.ctx.lineWidth = this.SNAKE_RADIUS * 2;
            this.ui.ctx.lineCap = 'round';
            this.ui.ctx.lineJoin = 'round';
            this.ui.ctx.stroke();
            
            // Head
            this.ui.ctx.fillStyle = '#166534';
            this.ui.ctx.beginPath();
            this.ui.ctx.arc(this.snake[0].x, this.snake[0].y, this.SNAKE_RADIUS, 0, Math.PI*2);
            this.ui.ctx.fill();
            
            // Eyes
            this.ui.ctx.fillStyle = 'white';
            this.ui.ctx.beginPath();
            this.ui.ctx.arc(this.snake[0].x - 5, this.snake[0].y - 5, 4, 0, Math.PI*2);
            this.ui.ctx.arc(this.snake[0].x + 5, this.snake[0].y - 5, 4, 0, Math.PI*2);
            this.ui.ctx.fill();
        }
        
        this.loopId = requestAnimationFrame(this.gameLoop);
    }
    
    destroy() {
        this.gameOver = true;
        cancelAnimationFrame(this.loopId);
        window.removeEventListener('resize', this.handleResize);
        this.container.innerHTML = '';
    }
}
