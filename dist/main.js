// Tetris Game - JavaScript Implementation
// Converted from Python Pygame version

const BLOCK_SIZE = 25;
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const CANVAS_WIDTH = GRID_WIDTH * BLOCK_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * BLOCK_SIZE;

// Colors
const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000',
};

// Tetromino definitions
const TETROMINOES = {
    I: {
        shape: [
            [[0, 1], [1, 1], [2, 1], [3, 1]],
            [[2, 0], [2, 1], [2, 2], [2, 3]],
            [[0, 2], [1, 2], [2, 2], [3, 2]],
            [[1, 0], [1, 1], [1, 2], [1, 3]],
        ],
        color: COLORS.I,
    },
    O: {
        shape: [
            [[1, 0], [2, 0], [1, 1], [2, 1]],
            [[1, 0], [2, 0], [1, 1], [2, 1]],
            [[1, 0], [2, 0], [1, 1], [2, 1]],
            [[1, 0], [2, 0], [1, 1], [2, 1]],
        ],
        color: COLORS.O,
    },
    T: {
        shape: [
            [[1, 0], [0, 1], [1, 1], [2, 1]],
            [[1, 0], [1, 1], [2, 1], [1, 2]],
            [[0, 1], [1, 1], [2, 1], [1, 2]],
            [[1, 0], [0, 1], [1, 1], [1, 2]],
        ],
        color: COLORS.T,
    },
    S: {
        shape: [
            [[1, 0], [2, 0], [0, 1], [1, 1]],
            [[1, 0], [1, 1], [2, 1], [2, 2]],
            [[1, 1], [2, 1], [0, 2], [1, 2]],
            [[0, 0], [0, 1], [1, 1], [1, 2]],
        ],
        color: COLORS.S,
    },
    Z: {
        shape: [
            [[0, 0], [1, 0], [1, 1], [2, 1]],
            [[2, 0], [1, 1], [2, 1], [1, 2]],
            [[0, 1], [1, 1], [1, 2], [2, 2]],
            [[1, 0], [0, 1], [1, 1], [0, 2]],
        ],
        color: COLORS.Z,
    },
    J: {
        shape: [
            [[0, 0], [0, 1], [1, 1], [2, 1]],
            [[1, 0], [2, 0], [1, 1], [1, 2]],
            [[0, 1], [1, 1], [2, 1], [2, 2]],
            [[1, 0], [1, 1], [0, 2], [1, 2]],
        ],
        color: COLORS.J,
    },
    L: {
        shape: [
            [[2, 0], [0, 1], [1, 1], [2, 1]],
            [[1, 0], [1, 1], [1, 2], [2, 2]],
            [[0, 1], [1, 1], [2, 1], [0, 2]],
            [[0, 0], [1, 0], [1, 1], [1, 2]],
        ],
        color: COLORS.L,
    },
};

const PIECE_NAMES = Object.keys(TETROMINOES);

// Speed curve (ms per drop)
const SPEEDS = [
    1000, 850, 720, 600, 500, 420, 350, 290, 240, 200,
    170, 140, 120, 100, 85, 70, 60, 50, 40, 30,
    25, 20, 15, 10,
];

// Scoring
const LINE_SCORES = { 1: 40, 2: 100, 3: 300, 4: 1200 };

class Piece {
    constructor(type, x = 3, y = 0, rotation = 0) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
    }

    getBlocks() {
        const shape = TETROMINOES[this.type].shape[this.rotation];
        return shape.map(([dx, dy]) => [this.x + dx, this.y + dy]);
    }

    getColor() {
        return TETROMINOES[this.type].color;
    }

    rotate(clockwise = true) {
        this.rotation = clockwise ? (this.rotation + 1) % 4 : (this.rotation + 3) % 4;
    }
}

class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.scoreEl = document.getElementById('score');
        this.levelEl = document.getElementById('level');
        this.linesEl = document.getElementById('lines');
        this.gameOverEl = document.getElementById('game-over');
        this.finalScoreEl = document.getElementById('final-score');

        this.setupControls();
        this.reset();
        this.lastTime = 0;
        this.gameLoop();
    }

    setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKey(e));

        // Touch buttons
        document.getElementById('btn-left').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.move(-1, 0);
        });
        document.getElementById('btn-right').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.move(1, 0);
        });
        document.getElementById('btn-rotate').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.rotate();
        });
        document.getElementById('btn-drop').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.softDrop();
        });
    }

    handleKey(e) {
        if (this.gameOver) return;

        switch (e.key) {
            case 'ArrowLeft':
                this.move(-1, 0);
                break;
            case 'ArrowRight':
                this.move(1, 0);
                break;
            case 'ArrowDown':
                this.softDrop();
                break;
            case 'ArrowUp':
            case 'x':
                this.rotate();
                break;
            case 'z':
                this.rotate(false);
                break;
            case ' ':
                this.hardDrop();
                break;
            case 'p':
                this.paused = !this.paused;
                break;
        }
    }

    reset() {
        this.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.gameOver = false;
        this.paused = false;
        this.bag = [];
        
        this.spawnPiece();
        this.updateUI();
        this.gameOverEl.style.display = 'none';
    }

    getSpeed() {
        return SPEEDS[Math.min(this.level - 1, SPEEDS.length - 1)];
    }

    refillBag() {
        this.bag = [...PIECE_NAMES];
        this.bag.sort(() => Math.random() - 0.5);
    }

    getNextPiece() {
        if (this.bag.length === 0) this.refillBag();
        return this.bag.pop();
    }

    spawnPiece() {
        this.currentPiece = new Piece(this.nextPieceType || this.getNextPiece());
        this.nextPieceType = this.getNextPiece();

        if (!this.isValidPosition(this.currentPiece)) {
            this.gameOver = true;
            this.gameOverEl.style.display = 'block';
            this.finalScoreEl.textContent = this.score;
        }

        this.canLock = true;
        this.lockDelay = 0;
    }

    isValidPosition(piece, grid = this.grid) {
        for (const [x, y] of piece.getBlocks()) {
            if (x < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return false;
            if (y >= 0 && grid[y][x] !== null) return false;
        }
        return true;
    }

    move(dx, dy) {
        if (!this.currentPiece || this.gameOver || this.paused) return false;

        this.currentPiece.x += dx;
        this.currentPiece.y += dy;

        if (this.isValidPosition(this.currentPiece)) {
            if (dy > 0) {
                this.lockDelay = 0;
                this.canLock = true;
            }
            return true;
        }

        this.currentPiece.x -= dx;
        this.currentPiece.y -= dy;
        return false;
    }

    rotate(clockwise = true) {
        if (!this.currentPiece || this.gameOver || this.paused) return;

        const originalRotation = this.currentPiece.rotation;
        this.currentPiece.rotate(clockwise);

        if (this.isValidPosition(this.currentPiece)) {
            this.lockDelay = 0;
            this.canLock = true;
            return;
        }

        // Wall kicks
        const kicks = [[-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]];
        
        for (const [dx, dy] of kicks) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            if (this.isValidPosition(this.currentPiece)) {
                this.lockDelay = 0;
                this.canLock = true;
                return;
            }
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;
        }

        this.currentPiece.rotation = originalRotation;
    }

    softDrop() {
        if (this.move(0, 1)) {
            this.score += 1;
            this.updateUI();
        }
    }

    hardDrop() {
        let distance = 0;
        while (this.move(0, 1)) distance++;
        this.lockPiece();
    }

    canMoveDown() {
        if (!this.currentPiece) return false;
        const testPiece = new Piece(this.currentPiece.type, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation);
        return this.isValidPosition(testPiece);
    }

    lockPiece() {
        if (!this.currentPiece) return;

        for (const [x, y] of this.currentPiece.getBlocks()) {
            if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
                this.grid[y][x] = this.currentPiece.getColor();
            }
        }

        this.currentPiece = null;
        this.checkLines();
        this.spawnPiece();
    }

    checkLines() {
        const linesToClear = [];
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            if (this.grid[y].every(cell => cell !== null)) {
                linesToClear.push(y);
            }
        }

        if (linesToClear.length === 0) return;

        // Clear lines
        for (const y of linesToClear.sort((a, b) => b - a)) {
            this.grid.splice(y, 1);
            this.grid.unshift(Array(GRID_WIDTH).fill(null));
        }

        // Update score
        this.linesCleared += linesToClear.length;
        this.score += (LINE_SCORES[linesToClear.length] || 0) * this.level;

        // Level up
        const newLevel = Math.floor(this.linesCleared / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
        }

        this.updateUI();
    }

    updateUI() {
        this.scoreEl.textContent = this.score;
        this.levelEl.textContent = this.level;
        this.linesEl.textContent = this.linesCleared;
    }

    update(dt) {
        if (this.gameOver || this.paused || !this.currentPiece) return;

        // Check if piece is on ground
        if (!this.canMoveDown()) {
            if (this.canLock) {
                this.lockDelay += dt;
                if (this.lockDelay >= 500) { // 500ms lock delay
                    this.lockPiece();
                }
            }
        } else {
            this.canLock = false;
            this.lockDelay = 0;
            
            // Normal falling
            this.fallTime = (this.fallTime || 0) + dt;
            if (this.fallTime >= this.getSpeed()) {
                this.move(0, 1);
                this.fallTime = 0;
            }
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0d0d1a';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw grid lines
        this.ctx.strokeStyle = '#2a2a4a';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= GRID_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= GRID_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(CANVAS_WIDTH, y * BLOCK_SIZE);
            this.ctx.stroke();
        }

        // Draw placed blocks
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (this.grid[y][x]) {
                    this.drawBlock(x, y, this.grid[y][x]);
                }
            }
        }

        // Draw current piece
        if (this.currentPiece) {
            // Ghost piece
            const ghost = this.getGhostPiece();
            for (const [x, y] of ghost.getBlocks()) {
                if (y >= 0) {
                    this.drawBlock(x, y, ghost.getColor(), 0.4);
                }
            }

            // Current piece
            for (const [x, y] of this.currentPiece.getBlocks()) {
                if (y >= 0) {
                    this.drawBlock(x, y, this.currentPiece.getColor());
                }
            }
        }
    }

    drawBlock(x, y, color, alpha = 1) {
        const px = x * BLOCK_SIZE;
        const py = y * BLOCK_SIZE;
        
        this.ctx.globalAlpha = alpha;
        
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, 3);
        this.ctx.fillRect(px + 1, py + 1, 3, BLOCK_SIZE - 2);

        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(px + 1, py + BLOCK_SIZE - 4, BLOCK_SIZE - 2, 3);
        this.ctx.fillRect(px + BLOCK_SIZE - 4, py + 1, 3, BLOCK_SIZE - 2);

        this.ctx.globalAlpha = 1;
    }

    getGhostPiece() {
        if (!this.currentPiece) return null;
        
        const ghost = new Piece(
            this.currentPiece.type,
            this.currentPiece.x,
            this.currentPiece.y,
            this.currentPiece.rotation
        );

        while (true) {
            ghost.y++;
            if (!this.isValidPosition(ghost)) {
                ghost.y--;
                break;
            }
        }

        return ghost;
    }

    gameLoop(timestamp = 0) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Start game
const game = new TetrisGame();

// Also expose for button onclick
window.game = game;