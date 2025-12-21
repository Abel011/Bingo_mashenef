// Game State Management
class GameState {
    static instance = null;
    
    constructor() {
        this.balance = 1000;
        this.wager = 50;
        this.selectedCenter = null;
        this.isPlaying = false;
        this.hasJoinedSession = false;
        this.markedCells = new Set();
        this.currentPattern = 'line';
        this.cardNumbers = [];
        this.sessionWon = false;
        this.wagerHistory = [];
        this.gameHistory = [];
        this.errorCount = 0;
    }
    
    static getInstance() {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }
    
    static initialize() {
        const state = GameState.getInstance();
        state.reset();
        console.log('GameState initialized');
    }
    
    reset() {
        this.selectedCenter = null;
        this.isPlaying = false;
        this.hasJoinedSession = false;
        this.markedCells.clear();
        this.sessionWon = false;
        this.cardNumbers = [];
    }
    
    updateBalance(amount) {
        if (typeof amount !== 'number') {
            throw new Error('Invalid amount type');
        }
        
        const oldBalance = this.balance;
        this.balance += amount;
        
        // Log balance change
        console.log(`Balance updated: ${oldBalance} -> ${this.balance} (${amount >= 0 ? '+' : ''}${amount})`);
        
        // Validate balance
        if (this.balance < 0) {
            this.balance = 0;
            console.warn('Balance negative, reset to 0');
        }
        
        // Update history
        this.wagerHistory.push({
            timestamp: Date.now(),
            amount: amount,
            type: amount >= 0 ? 'win' : 'loss',
            balanceBefore: oldBalance,
            balanceAfter: this.balance
        });
        
        // Keep only last 100 entries
        if (this.wagerHistory.length > 100) {
            this.wagerHistory.shift();
        }
        
        return this.balance;
    }
    
    canPlaceWager() {
        if (this.balance < this.wager) {
            return { success: false, reason: 'Insufficient balance' };
        }
        if (this.wager < 10 || this.wager > 500) {
            return { success: false, reason: 'Invalid wager amount' };
        }
        if (this.isPlaying) {
            return { success: false, reason: 'Already in game' };
        }
        return { success: true };
    }
    
    addGameRecord(record) {
        this.gameHistory.push({
            ...record,
            timestamp: Date.now(),
            sessionId: GameSession.sessionId
        });
        
        // Keep only last 50 games
        if (this.gameHistory.length > 50) {
            this.gameHistory.shift();
        }
        
        // Save to localStorage
        this.saveToStorage();
    }
    
    saveToStorage() {
        try {
            const data = {
                balance: this.balance,
                wagerHistory: this.wagerHistory,
                gameHistory: this.gameHistory
            };
            localStorage.setItem('bingo_game_state', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('bingo_game_state'));
            if (data) {
                this.balance = data.balance || 1000;
                this.wagerHistory = data.wagerHistory || [];
                this.gameHistory = data.gameHistory || [];
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
    }
    
    validateGameState() {
        const errors = [];
        
        if (this.balance < 0) {
            errors.push('Balance cannot be negative');
            this.balance = 0;
        }
        
        if (this.wager < 10) this.wager = 10;
        if (this.wager > 500) this.wager = 500;
        
        return errors;
    }
}

// Game Session Management
class GameSession {
    static drawnNumbers = [];
    static drawInterval = null;
    static sessionTimer = null;
    static drawCount = 0;
    static maxDraws = 75;
    static drawIntervalMs = 1000; // 1 second between draws
    static betweenGamesIntervalMs = 60000; // 1 minute between sessions
    static takenNumbers = new Set();
    static activePlayers = 1;
    static totalCards = 1;
    static sessionActive = true;
    static sessionEnded = false;
    static winnersCount = 0;
    static waitingForNextSession = false;
    static nextSessionTimer = null;
    static sessionId = 1;
    static currentBall = null;
    static recentWinners = [];
    
    static start() {
        this.sessionActive = true;
        this.sessionEnded = false;
        this.drawnNumbers = [];
        this.drawCount = 0;
        this.winnersCount = 0;
        this.waitingForNextSession = false;
        this.takenNumbers.clear();
        
        // Clear any existing intervals
        this.clearAllIntervals();
        
        // Start automatic draws every 1 second
        this.drawInterval = setInterval(() => {
            this.drawBall();
        }, this.drawIntervalMs);
        
        console.log(`Session ${this.sessionId} started`);
    }
    
    static drawBall() {
        if (this.drawCount >= this.maxDraws) {
            this.end();
            return;
        }
        
        let ball;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            ball = Math.floor(Math.random() * 200) + 1;
            attempts++;
            if (attempts > maxAttempts) {
                // If we can't find a unique number, reset the drawn numbers
                console.warn('Could not find unique number, resetting drawn numbers');
                this.drawnNumbers = [];
                break;
            }
        } while (this.drawnNumbers.includes(ball));
        
        this.drawnNumbers.push(ball);
        this.drawCount++;
        this.currentBall = ball;
        
        // Update stats
        StatsManager.recordDraw(ball);
        
        // Check for winners
        this.checkAllPlayers();
        
        console.log(`Draw ${this.drawCount}: ${ball}`);
    }
    
    static checkAllPlayers() {
        // In a real multiplayer game, this would check all connected players
        // For now, we'll just simulate some winners
        if (Math.random() < 0.01 && this.drawCount > 20) { // 1% chance per draw
            this.simulateWinner();
        }
    }
    
    static simulateWinner() {
        this.winnersCount++;
        const simulatedWinner = {
            id: `player_${Math.random().toString(36).substr(2, 9)}`,
            pattern: ['line', 'four-corners', 'x'][Math.floor(Math.random() * 3)],
            draws: this.drawCount,
            winnings: Math.floor(Math.random() * 500) + 100,
            cardNumbers: Array.from({length: 25}, () => Math.floor(Math.random() * 200) + 1)
        };
        
        this.recentWinners.unshift(simulatedWinner);
        if (this.recentWinners.length > 10) {
            this.recentWinners.pop();
        }
        
        // Add to history
        HistoryManager.addWinner(simulatedWinner);
    }
    
    static end() {
        clearInterval(this.drawInterval);
        this.sessionActive = false;
        this.sessionEnded = true;
        this.currentBall = null;
        
        console.log(`Session ${this.sessionId} ended`);
        
        // Start waiting period for next session
        this.startWaitingPeriod();
    }
    
    static startWaitingPeriod() {
        this.waitingForNextSession = true;
        let seconds = this.betweenGamesIntervalMs / 1000;
        
        // Update timer every second
        this.nextSessionTimer = setInterval(() => {
            seconds--;
            
            if (seconds <= 0) {
                clearInterval(this.nextSessionTimer);
                this.startNewSession();
            }
        }, 1000);
    }
    
    static startNewSession() {
        this.sessionId++;
        this.waitingForNextSession = false;
        
        this.clearAllIntervals();
        
        // Reset session state
        this.drawnNumbers = [];
        this.drawCount = 0;
        this.takenNumbers.clear();
        this.winnersCount = 0;
        this.sessionActive = true;
        this.sessionEnded = false;
        
        // Start new session
        this.start();
        
        console.log(`New session ${this.sessionId} started`);
    }
    
    static clearAllIntervals() {
        clearInterval(this.drawInterval);
        clearInterval(this.nextSessionTimer);
        clearInterval(this.sessionTimer);
    }
    
    static takeNumber(number) {
        if (this.takenNumbers.has(number)) {
            return false;
        }
        this.takenNumbers.add(number);
        this.totalCards++;
        return true;
    }
    
    static releaseNumber(number) {
        this.takenNumbers.delete(number);
        this.totalCards = Math.max(1, this.totalCards - 1);
    }
    
    static getSessionInfo() {
        return {
            sessionId: this.sessionId,
            drawCount: this.drawCount,
            maxDraws: this.maxDraws,
            sessionActive: this.sessionActive,
            waitingForNextSession: this.waitingForNextSession,
            winnersCount: this.winnersCount,
            activePlayers: this.activePlayers,
            totalCards: this.totalCards,
            currentBall: this.currentBall
        };
    }
}

// Error Handling
class ErrorHandler {
    static errors = [];
    
    static showError(message, isFatal = false) {
        console.error(`Error: ${message}`);
        
        this.errors.push({
            timestamp: Date.now(),
            message: message,
            isFatal: isFatal
        });
        
        // Keep only last 50 errors
        if (this.errors.length > 50) {
            this.errors.shift();
        }
        
        // Show error modal
        const modal = document.getElementById('errorModal');
        const messageEl = document.getElementById('errorMessage');
        
        if (modal && messageEl) {
            messageEl.textContent = message;
            modal.classList.add('active');
        }
        
        // If fatal error, disable game
        if (isFatal) {
            GameSession.clearAllIntervals();
            console.error('Fatal error occurred, game disabled');
        }
    }
    
    static clearErrors() {
        this.errors = [];
    }
    
    static getErrorStats() {
        const total = this.errors.length;
        const fatal = this.errors.filter(e => e.isFatal).length;
        const recent = this.errors.filter(e => Date.now() - e.timestamp < 3600000).length; // Last hour
        
        return { total, fatal, recent };
    }
}

// Initialize game state when module loads
try {
    GameState.initialize();
} catch (error) {
    ErrorHandler.showError(`Failed to initialize game: ${error.message}`, true);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState, GameSession, ErrorHandler };
}