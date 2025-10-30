const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('public'));

// Game state
const games = new Map(); // roomId -> game state
const players = new Map(); // ws -> player info

// CNCF project themes and colors
const CNCF_THEMES = [
  { name: 'Kubernetes', color: '#326CE5', logo: '☸️' },
  { name: 'Prometheus', color: '#E6522C', logo: '🔥' },
  { name: 'Envoy', color: '#AC6199', logo: '🎭' },
  { name: 'Jaeger', color: '#60D0E4', logo: '🔍' },
  { name: 'Fluentd', color: '#0E83C8', logo: '💧' },
  { name: 'Linkerd', color: '#2DCEAA', logo: '🔗' },
  { name: 'Helm', color: '#0F1689', logo: '⎈' },
  { name: 'Cilium', color: '#F8C517', logo: '🐝' }
];

// Snarky DevOps commentary
const SNARKY_COMMENTS = [
  "That's not very cloud-native of you...",
  "Should've used a horizontal pod autoscaler!",
  "Error 418: I'm a teapot... wait, wrong protocol",
  "Your snake has been reaped by the kubelet",
  "Hope you had proper monitoring in place!",
  "That collision was definitely not idempotent",
  "No rolling update could save you now",
  "Your snake failed the readiness probe",
  "Looks like you hit the resource limit!",
  "Time to file a postmortem incident report",
  "Your SLO just took a nosedive",
  "Should've implemented circuit breakers!",
  "That's a CrashLoopBackOff if I ever saw one",
  "Your snake needs more replicas!",
  "Distributed systems are hard, aren't they?"
];

// Food types with special bonuses
const FOOD_TYPES = {
  KUBERNETES: { points: 10, bonus: 5, name: 'Kubernetes Pod', emoji: '☸️' },
  PROMETHEUS: { points: 10, bonus: 5, name: 'Prometheus Metric', emoji: '📊' },
  HELM: { points: 15, bonus: 10, name: 'Helm Chart', emoji: '⎈' },
  CONTAINER: { points: 20, bonus: 15, name: 'Container Image', emoji: '📦' },
  OBSERVABILITY: { points: 25, bonus: 20, name: 'Full Observability Stack', emoji: '👁️' }
};

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.food = [];
    this.width = 800;
    this.height = 600;
    this.gridSize = 20;
    this.gameLoop = null;
    this.startGame();
  }

  startGame() {
    this.spawnFood();
    this.gameLoop = setInterval(() => {
      this.update();
      this.broadcast();
    }, 100);
  }

  addPlayer(ws, playerData) {
    const player = {
      id: playerData.id,
      name: playerData.name,
      theme: playerData.theme,
      snake: [
        { x: Math.floor(Math.random() * 30) * this.gridSize, y: Math.floor(Math.random() * 20) * this.gridSize }
      ],
      direction: { x: this.gridSize, y: 0 },
      nextDirection: { x: this.gridSize, y: 0 },
      score: 0,
      alive: true,
      ws: ws
    };
    this.players.push(player);
    return player;
  }

  removePlayer(ws) {
    this.players = this.players.filter(p => p.ws !== ws);
    if (this.players.length === 0) {
      clearInterval(this.gameLoop);
      games.delete(this.roomId);
    }
  }

  spawnFood() {
    while (this.food.length < 5) {
      const foodTypes = Object.keys(FOOD_TYPES);
      const type = foodTypes[Math.floor(Math.random() * foodTypes.length)];
      this.food.push({
        x: Math.floor(Math.random() * (this.width / this.gridSize)) * this.gridSize,
        y: Math.floor(Math.random() * (this.height / this.gridSize)) * this.gridSize,
        type: type
      });
    }
  }

  update() {
    for (const player of this.players) {
      if (!player.alive) continue;

      // Update direction
      player.direction = player.nextDirection;

      // Calculate new head position
      const head = { ...player.snake[0] };
      head.x += player.direction.x;
      head.y += player.direction.y;

      // Wrap around edges
      if (head.x < 0) head.x = this.width - this.gridSize;
      if (head.x >= this.width) head.x = 0;
      if (head.y < 0) head.y = this.height - this.gridSize;
      if (head.y >= this.height) head.y = 0;

      // Check collision with self
      if (player.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        player.alive = false;
        this.sendComment(player);
        continue;
      }

      // Check collision with other players
      for (const other of this.players) {
        if (other.id !== player.id && other.alive) {
          if (other.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            player.alive = false;
            this.sendComment(player);
            break;
          }
        }
      }

      if (!player.alive) continue;

      // Add new head
      player.snake.unshift(head);

      // Check food collision
      let ate = false;
      for (let i = this.food.length - 1; i >= 0; i--) {
        if (this.food[i].x === head.x && this.food[i].y === head.y) {
          const foodType = FOOD_TYPES[this.food[i].type];
          player.score += foodType.points;
          
          // Bonus points for eating multiple items quickly (combo system)
          if (player.lastEatTime && Date.now() - player.lastEatTime < 2000) {
            player.score += foodType.bonus;
            player.combo = (player.combo || 0) + 1;
          } else {
            player.combo = 0;
          }
          player.lastEatTime = Date.now();
          
          this.food.splice(i, 1);
          ate = true;
          break;
        }
      }

      // Remove tail if didn't eat
      if (!ate) {
        player.snake.pop();
      }
    }

    this.spawnFood();
  }

  sendComment(player) {
    const comment = SNARKY_COMMENTS[Math.floor(Math.random() * SNARKY_COMMENTS.length)];
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'comment',
        message: comment
      }));
    }
  }

  changeDirection(playerId, direction) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    // Prevent reversing
    if (direction.x !== 0 && player.direction.x === -direction.x) return;
    if (direction.y !== 0 && player.direction.y === -direction.y) return;

    player.nextDirection = direction;
  }

  broadcast() {
    const state = {
      type: 'gameState',
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        theme: p.theme,
        snake: p.snake,
        score: p.score,
        alive: p.alive,
        combo: p.combo || 0
      })),
      food: this.food
    };

    const message = JSON.stringify(state);
    for (const player of this.players) {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(message);
      }
    }
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'join') {
        // Join or create game
        const roomId = data.roomId || 'default';
        let game = games.get(roomId);
        
        if (!game) {
          game = new Game(roomId);
          games.set(roomId, game);
        }

        const player = game.addPlayer(ws, {
          id: data.playerId,
          name: data.playerName,
          theme: data.theme
        });

        players.set(ws, { game, playerId: data.playerId });

        ws.send(JSON.stringify({
          type: 'joined',
          playerId: data.playerId,
          themes: CNCF_THEMES
        }));

      } else if (data.type === 'direction') {
        const playerInfo = players.get(ws);
        if (playerInfo) {
          playerInfo.game.changeDirection(playerInfo.playerId, data.direction);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    const playerInfo = players.get(ws);
    if (playerInfo) {
      playerInfo.game.removePlayer(ws);
      players.delete(ws);
    }
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Snak8s server deployed on port ${PORT}`);
  console.log(`☸️  Cloud-native snake game ready for horizontal scaling!`);
});
