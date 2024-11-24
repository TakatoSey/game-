const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game constants
const GRAVITY = 0.3;
const JUMP_FORCE = -10;
const DOUBLE_JUMP_FORCE = -8;
const MAX_SPEED = 5;
const MIN_SPEED = 0.1;
const ACCELERATION = 0.5;
const DECELERATION = 0.9;
const AIR_RESISTANCE = 0.98;
const CAMERA_SMOOTHNESS = 0.08;

// Camera with improved smoothing
const camera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    shake: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    follow(target) {
        // Set target position with some look-ahead based on velocity
        this.targetX = -target.x + canvas.width / 3 + target.velocityX * 10;
        this.targetY = -target.y + canvas.height / 2 + target.velocityY * 2;
        
        // Smooth camera movement with variable speed based on distance
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = Math.min(CAMERA_SMOOTHNESS * (1 + distance / 500), 0.2);
        
        this.x += dx * speed;
        this.y += dy * speed;

        // Add camera shake
        if (this.shake > 0) {
            this.x += (Math.random() - 0.5) * this.shake;
            this.y += (Math.random() - 0.5) * this.shake;
            this.shake *= 0.9;
        }

        // Limit camera movement to map bounds
        this.x = Math.min(0, Math.max(this.x, -(MAP_WIDTH - canvas.width)));
        this.y = Math.min(0, Math.max(this.y, -(MAP_HEIGHT - canvas.height)));
    }
};

// Map dimensions
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 2000;

// Platform types
const PLATFORM_TYPES = {
    GRASS: { color: '#3a8c3f', friction: 0.85 },
    STONE: { color: '#808080', friction: 0.9 },
    ICE: { color: '#a5f2f3', friction: 0.98 },
    BOUNCE: { color: '#ff6b6b', friction: 0.85, bounce: -13 }
};

// Generate platforms
const platforms = [
    // Ground platforms
    { x: 0, y: MAP_HEIGHT - 100, width: MAP_WIDTH, height: 100, type: PLATFORM_TYPES.GRASS },
    
    // Main platforms
    { x: 300, y: MAP_HEIGHT - 200, width: 200, height: 20, type: PLATFORM_TYPES.GRASS },
    { x: 600, y: MAP_HEIGHT - 300, width: 200, height: 20, type: PLATFORM_TYPES.STONE },
    { x: 900, y: MAP_HEIGHT - 400, width: 200, height: 20, type: PLATFORM_TYPES.ICE },
    { x: 1200, y: MAP_HEIGHT - 500, width: 200, height: 20, type: PLATFORM_TYPES.BOUNCE },
    
    // Floating islands
    { x: 1500, y: MAP_HEIGHT - 400, width: 400, height: 40, type: PLATFORM_TYPES.GRASS },
    { x: 2000, y: MAP_HEIGHT - 600, width: 300, height: 30, type: PLATFORM_TYPES.STONE },
    { x: 2400, y: MAP_HEIGHT - 500, width: 250, height: 25, type: PLATFORM_TYPES.ICE },
    
    // Challenge platforms
    { x: 2800, y: MAP_HEIGHT - 400, width: 100, height: 20, type: PLATFORM_TYPES.BOUNCE },
    { x: 3000, y: MAP_HEIGHT - 500, width: 100, height: 20, type: PLATFORM_TYPES.BOUNCE },
    { x: 3200, y: MAP_HEIGHT - 600, width: 100, height: 20, type: PLATFORM_TYPES.BOUNCE },
    
    // High platforms
    { x: 1800, y: MAP_HEIGHT - 800, width: 150, height: 20, type: PLATFORM_TYPES.STONE },
    { x: 2100, y: MAP_HEIGHT - 900, width: 150, height: 20, type: PLATFORM_TYPES.ICE },
    { x: 2400, y: MAP_HEIGHT - 1000, width: 150, height: 20, type: PLATFORM_TYPES.BOUNCE },
];

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.canDoubleJump = true;
        this.color = '#' + Math.floor(Math.random()*16777215).toString(16);
        this.maxVelocityY = 15;
        this.direction = 1; // 1 for right, -1 for left
    }

    update() {
        // Apply gravity
        this.velocityY += GRAVITY;
        if (this.velocityY > this.maxVelocityY) {
            this.velocityY = this.maxVelocityY;
        }

        // Apply deceleration
        if (!keys['ArrowLeft'] && !keys['ArrowRight'] && !keys['a'] && !keys['d']) {
            this.velocityX *= DECELERATION;
        }

        // Stop if moving very slowly
        if (Math.abs(this.velocityX) < MIN_SPEED) {
            this.velocityX = 0;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        this.checkPlatformCollisions();

        // Keep player in bounds
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = 0;
        }
        if (this.x + this.radius * 2 > MAP_WIDTH) {
            this.x = MAP_WIDTH - this.radius * 2;
            this.velocityX = 0;
        }
        if (this.y + this.radius * 2 > MAP_HEIGHT) {
            this.y = MAP_HEIGHT - this.radius * 2;
            this.velocityY = 0;
            this.isJumping = false;
            this.canDoubleJump = true;
        }
    }

    checkPlatformCollisions() {
        for (let platform of platforms) {
            // Only check collision if player is moving downward
            if (this.velocityY > 0) {
                const wasAbove = this.y + this.radius * 2 - this.velocityY <= platform.y;
                
                if (wasAbove &&
                    this.x + this.radius * 2 > platform.x + 5 && // Add small margin for smoother edge detection
                    this.x < platform.x + platform.width - 5 &&
                    this.y + this.radius * 2 > platform.y &&
                    this.y + this.radius * 2 < platform.y + platform.height + this.velocityY) {
                    
                    this.y = platform.y - this.radius * 2;
                    if (platform.type.bounce) {
                        this.velocityY = platform.type.bounce;
                        this.isJumping = true;
                        this.canDoubleJump = true;
                        camera.shake = 5;
                    } else {
                        this.velocityY = 0;
                        this.isJumping = false;
                        this.canDoubleJump = true;
                        // Apply platform friction more gradually
                        this.velocityX = this.velocityX * (platform.type.friction + (1 - platform.type.friction) * 0.5);
                    }
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(camera.x, camera.y);
        
        // Draw player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.radius, this.y + this.radius * 2 + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + this.radius - 5 * this.direction, this.y + this.radius - 5, 5, 0, Math.PI * 2);
        ctx.arc(this.x + this.radius + 5 * this.direction, this.y + this.radius - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + this.radius - 5 * this.direction, this.y + this.radius - 5, 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.radius + 5 * this.direction, this.y + this.radius - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = JUMP_FORCE;
            this.isJumping = true;
        } else if (this.canDoubleJump) {
            this.velocityY = DOUBLE_JUMP_FORCE;
            this.canDoubleJump = false;
        }
    }
}

let players = {};
let localPlayer = null;

// Socket.io connection
const socket = io();

socket.on('connect', () => {
    localPlayer = new Player(Math.random() * (MAP_WIDTH - 40), 0);
    players[socket.id] = localPlayer;
    socket.emit('updatePlayer', { x: localPlayer.x, y: localPlayer.y, color: localPlayer.color });
});

socket.on('updatePlayers', (serverPlayers) => {
    // Update other players
    for (let id in serverPlayers) {
        if (id !== socket.id) {
            if (!players[id]) {
                players[id] = new Player(serverPlayers[id].x, serverPlayers[id].y);
            }
            players[id].x = serverPlayers[id].x;
            players[id].y = serverPlayers[id].y;
            players[id].color = serverPlayers[id].color;
        }
    }
    // Remove disconnected players
    for (let id in players) {
        if (!serverPlayers[id]) {
            delete players[id];
        }
    }
});

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp') {
        localPlayer?.jump();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function handleInput() {
    if (!localPlayer) return;
    
    if (keys['ArrowLeft'] || keys['a']) {
        localPlayer.direction = -1;
        localPlayer.velocityX -= ACCELERATION;
        if (localPlayer.velocityX < -MAX_SPEED) {
            localPlayer.velocityX = -MAX_SPEED;
        }
    }
    
    if (keys['ArrowRight'] || keys['d']) {
        localPlayer.direction = 1;
        localPlayer.velocityX += ACCELERATION;
        if (localPlayer.velocityX > MAX_SPEED) {
            localPlayer.velocityX = MAX_SPEED;
        }
    }
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update camera if local player exists
    if (localPlayer) {
        camera.follow(localPlayer);
    }
    
    ctx.save();
    ctx.translate(camera.x, camera.y);
    
    // Draw background
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 20; i++) {
        const x = (Date.now()/5000 + i * 500) % MAP_WIDTH;
        const y = 100 + i * 80;
        drawCloud(x, y);
    }
    
    // Draw platforms
    for (let platform of platforms) {
        ctx.fillStyle = platform.type.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add platform detail
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(platform.x, platform.y, platform.width, 5);
    }
    
    ctx.restore();

    // Handle input and update local player
    handleInput();
    if (localPlayer) {
        localPlayer.update();
        socket.emit('updatePlayer', { x: localPlayer.x, y: localPlayer.y, color: localPlayer.color });
    }

    // Draw all players
    for (let id in players) {
        players[id].draw();
    }

    requestAnimationFrame(gameLoop);
}

// Helper function to draw clouds
function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 25, y - 10, 25, 0, Math.PI * 2);
    ctx.arc(x + 25, y + 10, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
    ctx.fill();
}

gameLoop();
