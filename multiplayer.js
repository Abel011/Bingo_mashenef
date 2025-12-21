// Multiplayer Manager
class MultiplayerManager {
    static players = new Map();
    static simulationInterval = null;
    static connectionStatus = 'disconnected';
    static lastUpdate = 0;
    
    static init() {
        this.setupEventListeners();
        this.loadPlayerData();
    }
    
    static setupEventListeners() {
        // Network status monitoring
        window.addEventListener('online', () => {
            this.handleConnectionChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionChange(false);
        });
        
        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkConnection();
            }
        });
    }
    
    static handleConnectionChange(isOnline) {
        this.connectionStatus = isOnline ? 'connected' : 'disconnected';
        
        if (isOnline) {
            this.syncWithServer();
            UIManager.showNotification('Connected to game server', 'success');
        } else {
            UIManager.showNotification('Disconnected from server', 'error');
        }
        
        this.updateConnectionDisplay();
    }
    
    static updateConnectionDisplay() {
        const indicator = document.querySelector('.connection-status');
        if (!indicator) return;
        
        indicator.className = `connection-status ${this.connectionStatus}`;
        indicator.textContent = this.connectionStatus.toUpperCase();
    }
    
    static checkConnection() {
        const isOnline = navigator.onLine;
        this.handleConnectionChange(isOnline);
    }
    
    static syncWithServer() {
        // In a real implementation, this would sync with a backend server
        console.log('Syncing with server...');
        
        // Simulate server response
        setTimeout(() => {
            this.updatePlayerCount();
            this.updateTakenNumbers();
        }, 1000);
    }
    
    static updatePlayerCount() {
        // Simulate player count changes
        const baseCount = 5;
        const randomFactor = Math.floor(Math.random() * 10);
        GameSession.activePlayers = baseCount + randomFactor;
        
        UIManager.updateUI();
    }
    
    static updateTakenNumbers() {
        // Simulate other players taking numbers
        const takenCount = GameSession.takenNumbers.size;
        const targetCount = Math.min(50, GameSession.activePlayers * 3);
        
        if (takenCount < targetCount) {
            const numbersToTake = targetCount - takenCount;
            this.simulateNumberTaking(numbersToTake);
        }
        
        UIManager.updateTakenNumbers();
    }
    
    static simulateNumberTaking(count) {
        const availableNumbers = [];
        
        // Find available numbers
        for (let i = 1; i <= 200; i++) {
            if (!GameSession.takenNumbers.has(i)) {
                availableNumbers.push(i);
            }
        }
        
        // Take random numbers
        for (let i = 0; i < Math.min(count, availableNumbers.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const number = availableNumbers[randomIndex];
            
            GameSession.takeNumber(number);
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
        if (!GameSession.sessionActive) return;
        
        // Simulate player joins/leaves
        this.simulatePlayerChanges();
        
        // Simulate number taking
        this.simulateNumberTaking(Math.floor(Math.random() * 3));
        
        // Simulate wins
        this.simulateWins();
        
        // Update UI
        UIManager.updateUI();
    }
    
    static simulatePlayerChanges() {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        GameSession.activePlayers = Math.max(1, GameSession.activePlayers + change);
        
        // Update total cards
        GameSession.totalCards = GameSession.activePlayers + GameSession.takenNumbers.size;
    }
    
    static simulateWins() {
        if (!GameSession.sessionActive || GameSession.drawCount < 20) return;
        
        // 5% chance to simulate a win
        if (Math.random() < 0.05) {
            GameSession.simulateWinner();
            UIManager.updateUI();
            
            // Show notification
            UIManager.showNotification('Another player just won!', 'info');
        }
    }
    
    static loadPlayerData() {
        // Load player data from localStorage
        try {
            const playerData = localStorage.getItem('bingo_player');
            if (playerData) {
                const data = JSON.parse(playerData);
                this.players.set('local_player', data);
            }
        } catch (error) {
            console.error('Failed to load player data:', error);
        }
    }
    
    static savePlayerData() {
        // Save player data to localStorage
        try {
            const playerData = {
                lastPlayed: Date.now(),
                totalGames: StatsManager.playerStats.gamesPlayed,
                totalWins: StatsManager.playerStats.gamesWon,
                balance: GameState.getInstance().balance
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
        // In a real implementation, this would fetch from server
        const leaderboard = [];
        
        // Add simulated players
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}