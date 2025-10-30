// Game configuration
const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// CNCF Themes (will be populated from server)
let CNCF_THEMES = [];

// Game state
let ws = null;
let playerId = null;
let playerName = '';
let selectedTheme = null;
let currentScore = 0;
let currentCombo = 0;
let maxCombo = 0;
let gameState = null;

// DOM elements
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const themeSelector = document.getElementById('themeSelector');
const startButton = document.getElementById('startButton');
const leaveButton = document.getElementById('leaveButton');
const restartButton = document.getElementById('restartButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('combo');
const playersCountElement = document.getElementById('playersCount');
const commentaryElement = document.getElementById('commentary');
const leaderboardList = document.getElementById('leaderboardList');
const finalScoreElement = document.getElementById('finalScore');
const maxComboElement = document.getElementById('maxCombo');
const gameOverMessage = document.getElementById('gameOverMessage');

// Initialize themes
function initializeThemes() {
    // Default themes if server doesn't provide them
    CNCF_THEMES = [
        { name: 'Kubernetes', color: '#326CE5', logo: '☸️' },
        { name: 'Prometheus', color: '#E6522C', logo: '🔥' },
        { name: 'Envoy', color: '#AC6199', logo: '🎭' },
        { name: 'Jaeger', color: '#60D0E4', logo: '🔍' },
        { name: 'Fluentd', color: '#0E83C8', logo: '💧' },
        { name: 'Linkerd', color: '#2DCEAA', logo: '🔗' },
        { name: 'Helm', color: '#0F1689', logo: '⎈' },
        { name: 'Cilium', color: '#F8C517', logo: '🐝' }
    ];

    themeSelector.innerHTML = '';
    CNCF_THEMES.forEach((theme, index) => {
        const option = document.createElement('div');
        option.className = 'theme-option';
        option.style.backgroundColor = theme.color;
        option.style.color = '#fff';
        option.innerHTML = `
            <div class="theme-logo">${theme.logo}</div>
            <div>${theme.name}</div>
        `;
        option.addEventListener('click', () => selectTheme(index));
        themeSelector.appendChild(option);
    });

    // Select first theme by default
    selectTheme(0);
}

function selectTheme(index) {
    selectedTheme = CNCF_THEMES[index];
    const options = themeSelector.querySelectorAll('.theme-option');
    options.forEach((option, i) => {
        option.classList.toggle('selected', i === index);
    });
}

// WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        // Join game
        ws.send(JSON.stringify({
            type: 'join',
            playerId: playerId,
            playerName: playerName,
            roomId: roomIdInput.value || 'default',
            theme: selectedTheme
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'joined') {
            if (data.themes) {
                CNCF_THEMES = data.themes;
            }
            console.log('Joined game');
        } else if (data.type === 'gameState') {
            gameState = data;
            updateGame();
        } else if (data.type === 'comment') {
            showCommentary(data.message);
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        if (gameScreen.classList.contains('hidden') === false) {
            // Show game over if we were playing
            endGame();
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Start game
startButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim() || 'anonymous-snake';
    playerId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    currentScore = 0;
    currentCombo = 0;
    maxCombo = 0;
    
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    connectWebSocket();
});

// Leave game
leaveButton.addEventListener('click', () => {
    if (ws) {
        ws.close();
    }
    showMenu();
});

// Restart game
restartButton.addEventListener('click', () => {
    showMenu();
});

function showMenu() {
    menuScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    commentaryElement.textContent = '';
}

// Update game display
function updateGame() {
    if (!gameState) return;

    // Find current player
    const player = gameState.players.find(p => p.id === playerId);
    
    if (player) {
        currentScore = player.score;
        currentCombo = player.combo || 0;
        maxCombo = Math.max(maxCombo, currentCombo);
        
        scoreElement.textContent = currentScore;
        comboElement.textContent = currentCombo > 0 ? `${currentCombo}x 🔥` : '0x';
        
        // Check if player died
        if (!player.alive) {
            endGame();
            return;
        }
    }

    playersCountElement.textContent = gameState.players.filter(p => p.alive).length;

    // Draw game
    drawGame();
    
    // Update leaderboard
    updateLeaderboard();
}

function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid (subtle)
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }

    // Draw food
    gameState.food.forEach(food => {
        const emoji = getFoodEmoji(food.type);
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, food.x + GRID_SIZE / 2, food.y + GRID_SIZE / 2);
    });

    // Draw snakes
    gameState.players.forEach(player => {
        if (player.snake.length === 0) return;

        const theme = player.theme || CNCF_THEMES[0];
        const isCurrentPlayer = player.id === playerId;
        
        player.snake.forEach((segment, index) => {
            if (index === 0) {
                // Head
                ctx.fillStyle = player.alive ? theme.color : '#666';
                ctx.fillRect(segment.x, segment.y, GRID_SIZE, GRID_SIZE);
                
                // Draw logo on head
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(theme.logo, segment.x + GRID_SIZE / 2, segment.y + GRID_SIZE / 2);
            } else {
                // Body
                const alpha = player.alive ? 1 - (index / player.snake.length) * 0.5 : 0.3;
                ctx.fillStyle = hexToRGBA(theme.color, alpha);
                ctx.fillRect(segment.x + 1, segment.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            }
        });

        // Draw player name above head if alive
        if (player.alive && player.snake.length > 0) {
            const head = player.snake[0];
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(player.name, head.x + GRID_SIZE / 2, head.y - 8);
            ctx.fillText(player.name, head.x + GRID_SIZE / 2, head.y - 8);
        }
    });
}

function getFoodEmoji(type) {
    const foodTypes = {
        KUBERNETES: '☸️',
        PROMETHEUS: '📊',
        HELM: '⎈',
        CONTAINER: '📦',
        OBSERVABILITY: '👁️'
    };
    return foodTypes[type] || '🍎';
}

function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateLeaderboard() {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    leaderboardList.innerHTML = '';
    sortedPlayers.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = `leaderboard-item ${!player.alive ? 'dead' : ''}`;
        
        const theme = player.theme || CNCF_THEMES[0];
        
        item.innerHTML = `
            <div class="player-info">
                <span class="player-logo">${theme.logo}</span>
                <span class="player-name">${index + 1}. ${player.name}</span>
                ${!player.alive ? '<span style="color: #dc3545;">💀</span>' : ''}
            </div>
            <span class="player-score">${player.score}</span>
        `;
        
        leaderboardList.appendChild(item);
    });
}

function showCommentary(message) {
    commentaryElement.textContent = message;
    setTimeout(() => {
        commentaryElement.textContent = '';
    }, 5000);
}

function endGame() {
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    
    finalScoreElement.textContent = currentScore;
    maxComboElement.textContent = `${maxCombo}x`;
    
    const messages = [
        "That's not very cloud-native of you...",
        "Should've used a horizontal pod autoscaler!",
        "Your snake has been reaped by the kubelet",
        "Hope you had proper monitoring in place!",
        "That collision was definitely not idempotent",
        "No rolling update could save you now",
        "Your snake failed the readiness probe",
        "Looks like you hit the resource limit!",
        "Time to file a postmortem incident report",
        "Your SLO just took a nosedive"
    ];
    
    gameOverMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
    
    if (ws) {
        ws.close();
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (gameScreen.classList.contains('hidden')) return;

    let direction = null;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            direction = { x: 0, y: -GRID_SIZE };
            e.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            direction = { x: 0, y: GRID_SIZE };
            e.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            direction = { x: -GRID_SIZE, y: 0 };
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            direction = { x: GRID_SIZE, y: 0 };
            e.preventDefault();
            break;
    }

    if (direction) {
        ws.send(JSON.stringify({
            type: 'direction',
            direction: direction
        }));
    }
});

// Initialize on page load
initializeThemes();
