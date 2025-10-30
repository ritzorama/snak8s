# ☸️ Snak8s - Cloud Native Snake Game

A cloud-native, multiplayer snake game inspired by snakes.io with a CNCF twist! Experience the classic snake gameplay with Kubernetes-themed colors, CNCF project logos, and snarky DevOps commentary.

## 🚀 Features

- **Multiplayer Support**: Play with friends in real-time using WebSocket connections
- **CNCF-Themed Color Schemes**: Choose from 8 different CNCF project color themes:
  - Kubernetes (blue)
  - Prometheus (orange)
  - Envoy (purple)
  - Jaeger (cyan)
  - Fluentd (blue)
  - Linkerd (teal)
  - Helm (dark blue)
  - Cilium (yellow)
- **Cloud-Native Commentary**: Get snarky remarks infused with DevOps, SRE, and Kubernetes vernacular when your snake dies
- **Scoring System with Bonuses**: Earn points by consuming CNCF project logos with combo multipliers for quick successive consumption
- **Live Leaderboard**: Real-time metrics dashboard showing all players' scores
- **Smooth Gameplay**: Classic snake mechanics with edge wrapping and collision detection

## 🎮 How to Play

1. **Deploy Your Snake**: Enter your snake deployment name and choose a namespace (room)
2. **Select Theme**: Pick your favorite CNCF project color scheme
3. **Navigate**: Use arrow keys or WASD to control your snake
4. **Consume Resources**: Eat CNCF project logos to grow and score points
5. **Build Combos**: Eat items quickly in succession for bonus points
6. **Avoid Collisions**: Don't crash into other snakes or yourself!

## 🎯 Scoring System

Different food types award different points:

- ☸️ **Kubernetes Pod**: 10 points (+5 combo bonus)
- 📊 **Prometheus Metric**: 10 points (+5 combo bonus)
- ⎈ **Helm Chart**: 15 points (+10 combo bonus)
- 📦 **Container Image**: 20 points (+15 combo bonus)
- 👁️ **Full Observability Stack**: 25 points (+20 combo bonus)

Combo bonuses are awarded when you eat items within 2 seconds of each other!

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ritzorama/snak8s.git
cd snak8s
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## 🎮 Game Controls

- **Arrow Keys** or **WASD**: Move your snake
- **Leave Namespace Button**: Exit the current game
- **Redeploy Button**: Start a new game after game over

## 🏗️ Technical Architecture

### Backend (Node.js + Express + WebSocket)

- **server.js**: WebSocket server handling multiplayer game state, player connections, and game logic
- Real-time state synchronization across all connected clients
- Room-based game instances (namespaces)

### Frontend (HTML5 Canvas + Vanilla JavaScript)

- **index.html**: Main game interface with menu, game, and game-over screens
- **style.css**: Responsive styling with cloud-native gradient theme
- **game.js**: Client-side game rendering, WebSocket communication, and input handling

## 🌐 Multiplayer

Players can join the same room by entering the same "Namespace (Room ID)" on the menu screen. The default room is "default", but you can create custom rooms by entering any room name.

## 📝 Development

The game uses:
- Express.js for serving static files
- WebSocket (ws) for real-time multiplayer communication
- HTML5 Canvas for rendering
- Vanilla JavaScript (no frameworks) for simplicity

## 🎨 Customization

You can modify the CNCF themes in `server.js` by editing the `CNCF_THEMES` array. Each theme includes:
- `name`: Project name
- `color`: Hex color code
- `logo`: Emoji or character to display

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add more CNCF project themes
- Enhance the commentary with more DevOps jokes
- Improve game mechanics
- Add new power-ups or food types

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the original snakes.io game
- CNCF project logos and colors used for educational purposes
- Not officially affiliated with CNCF or any of its projects

## 🐛 Known Issues

None currently! If you find any bugs, please open an issue.

---

Built with ❤️ for the CNCF community