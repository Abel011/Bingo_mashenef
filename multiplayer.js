// Multiplayer Manager
class MultiplayerManager {
    static players = new Map();
    static simulationInterval = null;
    static connectionStatus = 'connected';
    static lastUpdate = Date.now();
    
    static init() {
        console.log('Multiplayer Manager initializing...');
        this.setupEventListeners();
        this.loadPlayerData();
        this.updateConnectionDisplay();
        return true;
    }
    
    static setupEventListeners() {
        // Network status monitoring
        if (window.addEventListener) {
            window.addEventListener('online', () => {
                this.handleConnectionChange(true);
            });
            
            window.addEventListener('offline', () => {
                this.handleConnectionChange(false);
            });
        }
        
        // Visibility change
        if (document.addEventListener) {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.checkConnection();
                }
            });
        }
    }
    
    static handleConnectionChange(isOnline) {
        this.connectionStatus = isOnline ? 'connected' : 'disconnected';
        
        if (isOnline) {
            this.syncWithServer();
        }
        
        this.updateConnectionDisplay();
    }
    
    static updateConnectionDisplay() {
        // Create connection indicator if it doesn't exist
        let indicator = document.querySelector('.connection-status');
        
        if (!indicator) {
            // Add to top bar
            const topBar = document.querySelector('.top-bar');
            if (topBar) {
                indicator = document.createElement('div');
                indicator.className = `connection-status ${this.connectionStatus}`;
                indicator.textContent = this.connectionStatus.toUpperCase();
                indicator.style.cssText = `
                    font-size: 0.7rem;
                    padding: 4px 8px;
                    border-radius: 12px;
                    background: ${this.connectionStatus === 'connected' ? 'var(--secondary)' : 'var(--danger)'};
                    color: white;
                    font-weight: bold;
                `;
                topBar.appendChild(indicator);
            }
        } else {
            indicator.className = `connection-status ${this.connectionStatus}`;
            indicator.textContent = this.connectionStatus.toUpperCase();
            indicator.style.background = this.connectionStatus === 'connected' ? 'var(--secondary)' : 'var(--danger)';
        }
    }
    
    static checkConnection() {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this.handleConnectionChange(isOnline);
    }
    
    static syncWithServer() {
        console.log('Syncing with server...');
        this.lastUpdate = Date.now();
        
        // Simulate server sync
        setTimeout(() => {
            this.updatePlayerCount();
            this.updateTakenNumbers();
        }, 500);
    }
    
    static updatePlayerCount() {
        const game = GameManager.getInstance();
        
        // Simulate player count changes
        const baseCount = 5;
        const randomFactor = Math.floor(Math.random() * 10);
        const simulatedPlayers = baseCount + randomFactor;
        
        // Update only if significantly different
        if (Math.abs(game.activePlayers - simulatedPlayers) > 2) {
            game.activePlayers = simulatedPlayers;
            UIManager.updateStats();
        }
    }
    
    static updateTakenNumbers() {
        const game = GameManager.getInstance();
        
        // Simulate other players taking numbers
        const takenCount = game.takenNumbers.size;
        const targetCount = Math.min(50, game.activePlayers * 3);
        
        if (takenCount < targetCount) {
            const numbersToTake = targetCount - takenCount;
            this.simulateNumberTaking(numbersToTake);
        }
        
        UIManager.updateTakenNumbers();
    }
    
    static simulateNumberTaking(count) {
        const game = GameManager.getInstance();
        const availableNumbers = [];
        
        // Find available numbers
        for (let i = 1; i <= 200; i++) {
            if (!game.takenNumbers.has(i)) {
                availableNumbers.push(i);
            }
        }
        
        // Take random numbers
        const numbersToTake = Math.min(count, Math.floor(availableNumbers.length * 0.3));
        
        for (let i = 0; i < numbersToTake; i++) {
            if (availableNumbers.length === 0) break;
            
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const number = availableNumbers[randomIndex];
            
            game.takenNumbers.add(number);
            availableNumbers.splice(randomIndex, 1);
        }
    }
    
    static startSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        // Update player simulation every 10 seconds
        this.simulationInterval = setInterval(() => {
            this.simulateMultiplayerActivity();
        }, 10000);
        
        // Initial simulation
        this.simulateMultiplayerActivity();
    }
    
    static simulateMultiplayerActivity() {
        const game = GameManager.getInstance();
        
        if (!game.sessionId || game.currentPhase !== 'drawing') return;
        
        // Simulate player joins/leaves
        this.simulatePlayerChanges();
        
        // Simulate number taking occasionally
        if (Math.random() < 0.3) {
            this.simulateNumberTaking(Math.floor(Math.random() * 3));
        }
        
        // Simulate wins during drawing phase
        if (game.currentPhase === 'drawing' && game.drawsCompleted > 20 && Math.random() < 0.05) {
            this.simulateWin();
        }
        
        // Update UI
        UIManager.updateUI();
    }
    
    static simulatePlayerChanges() {
        const game = GameManager.getInstance();
        
        // Small random change to player count
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const newCount = Math.max(1, game.activePlayers + change);
        
        // Only update if changed
        if (newCount !== game.activePlayers) {
            game.activePlayers = newCount;
        }
        
        // Update total cards
        game.totalCards = game.activePlayers + game.takenNumbers.size;
    }
    
    static simulateWin() {
        const game = GameManager.getInstance();
        
        // Simulate a win announcement
        const patterns = ['line', 'four-corners', 'x'];
        const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const winnings = Math.floor(Math.random() * 500) + 100;
        
        // Add to winners list
        game.winners.push({
            player: `Player_${Math.floor(Math.random() * 1000)}`,
            pattern: randomPattern,
            winnings: winnings,
            draws: game.drawsCompleted
        });
        
        // Show notification occasionally
        if (Math.random() < 0.3) {
            setTimeout(() => {
                UIManager.showNotification('Another player just won!', 'info');
            }, 1000);
        }
        
        // Update stats
        UIManager.updateStats();
    }
    
    static loadPlayerData() {
        try {
            const playerData = localStorage.getItem('bingo_player');
            if (playerData) {
                const data = JSON.parse(playerData);
                this.players.set('local_player', data);
                console.log('Player data loaded');
            }
        } catch (error) {
            console.error('Failed to load player data:', error);
        }
    }
    
    static savePlayerData() {
        try {
            const game = GameManager.getInstance();
            const stats = StatsManager.getPlayerStats();
            
            const playerData = {
                lastPlayed: Date.now(),
                totalGames: stats.gamesPlayed,
                totalWins: stats.gamesWon,
                balance: game.balance,
                playerStats: stats
            };
            
            localStorage.setItem('bingo_player', JSON.stringify(playerData));
        } catch (error) {
            console.error('Failed to save player data:', error);
        }
    }
    
    static getPlayerStats(playerId) {
        return this.players.get(playerId) || null;
    }
    
    static updatePlayerStats(stats) {
        const playerId = 'local_player';
        const currentStats = this.getPlayerStats(playerId) || {};
        
        this.players.set(playerId, {
            ...currentStats,
            ...stats,
            updatedAt: Date.now()
        });
        
        this.savePlayerData();
    }
    
    static getLeaderboard(limit = 10) {
        // Simulated leaderboard
        const leaderboard = [];
        
        for (let i = 0; i < limit; i++) {
            leaderboard.push({
                rank: i + 1,
                playerId: `player_${i}`,
                name: `Player ${i + 1}`,
                wins: Math.floor(Math.random() * 50),
                totalWon: Math.floor(Math.random() * 5000),
                bestWin: Math.floor(Math.random() * 1000)
            });
        }
        
        // Sort by wins
        leaderboard.sort((a, b) => b.wins - a.wins);
        
        return leaderboard;
    }
    
    static disconnect() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        this.connectionStatus = 'disconnected';
        this.updateConnectionDisplay();
    }
}

// Initialize Multiplayer Manager
MultiplayerManager.init();

// Make globally available
window.MultiplayerManager = MultiplayerManager;
