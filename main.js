// Main Game Controller
class BingoGame {
    static init() {
        console.log('Initializing Bingo Game...');
        
        try {
            // Initialize all components
            GameState.initialize();
            UIManager.init();
            HistoryManager.init();
            StatsManager.init();
            MultiplayerManager.init();
            
            // Start game session
            GameSession.start();
            
            // Start hot numbers updates
            StatsManager.updateHotNumbers();
            
            // Start multiplayer simulation
            MultiplayerManager.startSimulation();
            
            // Setup game loop
            this.setupGameLoop();
            
            // Load initial data
            HistoryManager.loadHistory();
            
            // Check for errors
            this.checkForErrors();
            
            console.log('Bingo Game initialized successfully');
            
            // Show welcome message
            setTimeout(() => {
                UIManager.showNotification('Welcome to Bingo Multiplayer!', 'success');
            }, 1000);
            
        } catch (error) {
            ErrorHandler.showError(`Failed to initialize game: ${error.message}`, true);
            console.error('Initialization error:', error);
        }
    }
    
    static setupGameLoop() {
        // Game loop runs every second
        setInterval(() => {
            try {
                // Update from game session
                UIManager.updateFromGameSession();
                
                // Update statistics
                StatsManager.updateHotNumbers();
                
                // Check for session end
                if (GameSession.drawCount >= GameSession.maxDraws && 
                    GameSession.sessionActive) {
                    GameSession.end();
                }
                
                // Auto-save every 30 seconds
                if (Date.now() % 30000 < 1000) {
                    this.autoSave();
                }
                
            } catch (error) {
                console.error('Game loop error:', error);
                ErrorHandler.showError(`Game loop error: ${error.message}`);
            }
        }, 1000);
    }
    
    static autoSave() {
        try {
            GameState.getInstance().saveToStorage();
            HistoryManager.saveToStorage();
            StatsManager.saveStats();
            MultiplayerManager.savePlayerData();
            
            console.log('Game auto-saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    static checkForErrors() {
        const state = GameState.getInstance();
        const errors = state.validateGameState();
        
        if (errors.length > 0) {
            errors.forEach(error => {
                ErrorHandler.showError(`Game state error: ${error}`);
            });
        }
        
        // Check connection
        MultiplayerManager.checkConnection();
    }
    
    static resetGame() {
        if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
            try {
                // Clear all intervals
                GameSession.clearAllIntervals();
                if (MultiplayerManager.simulationInterval) {
                    clearInterval(MultiplayerManager.simulationInterval);
                }
                
                // Clear storage
                localStorage.removeItem('bingo_game_state');
                localStorage.removeItem('bingo_history');
                localStorage.removeItem('bingo_winners');
                localStorage.removeItem('bingo_stats');
                localStorage.removeItem('bingo_player');
                
                // Reload page
                location.reload();
                
            } catch (error) {
                ErrorHandler.showError(`Failed to reset game: ${error.message}`);
            }
        }
    }
    
    static exportGameData() {
        try {
            const data = {
                gameState: GameState.getInstance(),
                history: HistoryManager.history,
                winners: HistoryManager.winners,
                stats: StatsManager.drawStats,
                playerStats: StatsManager.playerStats,
                exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bingo_game_data_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            UIManager.showNotification('Game data exported', 'success');
            
        } catch (error) {
            ErrorHandler.showError(`Failed to export game data: ${error.message}`);
        }
    }
    
    static getGameInfo() {
        return {
            version: '1.0.0',
            sessionId: GameSession.sessionId,
            drawCount: GameSession.drawCount,
            activePlayers: GameSession.activePlayers,
            connectionStatus: MultiplayerManager.connectionStatus,
            balance: GameState.getInstance().balance,
            errors: ErrorHandler.getErrorStats()
        };
    }
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        BingoGame.init();
    });
} else {
    BingoGame.init();
}

// Make available globally
window.BingoGame = BingoGame;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BingoGame;
}