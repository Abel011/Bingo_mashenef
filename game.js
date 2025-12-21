// Game State Management
class GameState {
    static instance = null;
    
    static getInstance() {
        if (!GameState.instance) {
            GameState.instance = {
                balance: 1000,
                wager: 50,
                selectedCenter: null,
                isPlaying: false,
                hasJoinedSession: false,
                markedCells: new Set(),
                currentPattern: 'line',
                cardNumbers: [],
                sessionWon: false,
                wagerHistory: [],
                gameHistory: []
            };
        }
        return GameState.instance;
    }
}

// Game Session Management
class GameSession {
    static drawnNumbers = [];
    static drawInterval = null;
    static drawCount = 0;
    static maxDraws = 75;
    static drawIntervalMs = 1000;
    static betweenGamesIntervalMs = 60000;
    static takenNumbers = new Set();
    static activePlayers = 3;
    static totalCards = 3;
    static sessionActive = true;
    static sessionEnded = false;
    static winnersCount = 0;
    static waitingForNextSession = false;
    static nextSessionTimer = null;
    static sessionId = 1;
    static currentBall = null;
    static recentWinners = [];
    static callHistory = [];
    
    static startGameSession() {
        this.sessionActive = true;
        this.sessionEnded = false;
        this.drawnNumbers = [];
        this.drawCount = 0;
        this.winnersCount = 0;
        this.waitingForNextSession = false;
        this.currentBall = null;
        this.callHistory = [];
        
        // Clear existing intervals
        if (this.drawInterval) clearInterval(this.drawInterval);
        if (this.nextSessionTimer) clearInterval(this.nextSessionTimer);
        
        // Start draws every second
        this.drawInterval = setInterval(() => {
            this.drawBall();
        }, this.drawIntervalMs);
        
        // Update UI
        UIManager.updateUI();
        UIManager.showNotification('New session started!', 'success');
    }
    
    static drawBall() {
        if (this.drawCount >= this.maxDraws) {
            this.endGameSession();
            return;
        }
        
        let ball;
        do {
            ball = Math.floor(Math.random() * 200) + 1;
        } while (this.drawnNumbers.includes(ball));
        
        this.drawnNumbers.push(ball);
        this.drawCount++;
        this.currentBall = ball;
        
        // Get letter for the ball
        const letterInfo = BingoAnnouncer.getLetterForNumber(ball);
        
        // Add to call history
        this.callHistory.unshift({
            number: ball,
            letter: letterInfo.letter,
            color: letterInfo.color,
            timestamp: Date.now()
        });
        
        // Keep only last 15 calls
        if (this.callHistory.length > 15) {
            this.callHistory.pop();
        }
        
        // Update announcements
        BingoAnnouncer.announceNumber(ball);
        
        // Mark cells on playing cards
        this.markCellsForPlayers(ball);
        
        // Check for winners
        this.checkWinners();
        
        // Update UI
        UIManager.updateUI();
        UIManager.updateCallHistory();
        
        // Simulate other players occasionally
        if (Math.random() < 0.1 && this.drawCount > 20) {
            this.simulateOtherPlayerWin();
        }
    }
    
    static markCellsForPlayers(ball) {
        const state = GameState.getInstance();
        
        if (state.isPlaying && state.hasJoinedSession) {
            const cells = document.querySelectorAll('.cell');
            cells.forEach(cell => {
                if (cell.dataset.val == ball) {
                    state.markedCells.add(cell.dataset.val);
                    cell.classList.add('marked');
                    
                    // Check if player won
                    UIManager.checkWin();
                }
            });
        }
    }
    
    static checkWinners() {
        // In a real game, this would check all players
        // Here we just simulate occasionally
        if (Math.random() < 0.02 && this.drawCount > 30) {
            this.winnersCount++;
            UIManager.updateUI();
            
            // Add simulated winner
            const simulatedWinner = {
                playerId: 'player_' + Math.random().toString(36).substr(2, 9),
                number: Math.floor(Math.random() * 200) + 1,
                pattern: ['line', 'four-corners', 'x'][Math.floor(Math.random() * 3)],
                winnings: Math.floor(Math.random() * 500) + 100,
                draws: this.drawCount
            };
            
            this.recentWinners.unshift(simulatedWinner);
            if (this.recentWinners.length > 10) {
                this.recentWinners.pop();
            }
        }
    }
    
    static simulateOtherPlayerWin() {
        this.winnersCount++;
        UIManager.showNotification('🎉 Another player just won Bingo!', 'info');
        UIManager.updateUI();
    }
    
    static endGameSession() {
        clearInterval(this.drawInterval);
        this.sessionActive = false;
        this.sessionEnded = true;
        this.currentBall = null;
        
        // Show lose modal for any playing players
        const state = GameState.getInstance();
        if (state.isPlaying && !state.sessionWon) {
            setTimeout(() => {
                document.getElementById('loseAmount').textContent = `-${state.wager}`;
                document.getElementById('loseModal').classList.add('active');
                state.isPlaying = false;
                state.hasJoinedSession = false;
            }, 1000);
        }
        
        // Start waiting period for next session
        this.startWaitingPeriod();
    }
    
    static startWaitingPeriod() {
        this.waitingForNextSession = true;
        let seconds = 60;
        
        this.nextSessionTimer = setInterval(() => {
            seconds--;
            document.getElementById('nextSessionTimer').textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(this.nextSessionTimer);
                this.startNewSession();
            }
        }, 1000);
    }
    
    static startNewSession() {
        this.sessionId++;
        this.waitingForNextSession = false;
        
        // Clear taken numbers for new session
        this.takenNumbers.clear();
        
        // Reset for new session
        this.startGameSession();
        
        // Reset player state
        const state = GameState.getInstance();
        state.isPlaying = false;
        state.hasJoinedSession = false;
        state.selectedCenter = null;
        state.markedCells.clear();
        
        // Update UI
        UIManager.updateUI();
        UIManager.showNotification('New session ready! Use Quick Join!', 'success');
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
}

// Bingo Pattern Checkers
class BingoPatterns {
    static checkLineBingo() {
        const cells = document.querySelectorAll('.cell');
        
        // Check rows
        for (let row = 0; row < 5; row++) {
            let complete = true;
            for (let col = 0; col < 5; col++) {
                const idx = row * 5 + col;
                if (idx === 12) continue; // Skip free space
                if (!cells[idx].classList.contains('marked')) {
                    complete = false;
                    break;
                }
            }
            if (complete) return true;
        }
        
        // Check columns
        for (let col = 0; col < 5; col++) {
            let complete = true;
            for (let row = 0; row < 5; row++) {
                const idx = row * 5 + col;
                if (idx === 12) continue;
                if (!cells[idx].classList.contains('marked')) {
                    complete = false;
                    break;
                }
            }
            if (complete) return true;
        }
        
        return false;
    }
    
    static checkFourCorners() {
        const cells = document.querySelectorAll('.cell');
        const corners = [0, 4, 20, 24];
        return corners.every(idx => cells[idx].classList.contains('marked'));
    }
    
    static checkFullHouse() {
        const cells = document.querySelectorAll('.cell');
        return Array.from(cells).every(cell => cell.classList.contains('marked'));
    }
    
    static checkXBingo() {
        const cells = document.querySelectorAll('.cell');
        
        // Main diagonal
        for (let i = 0; i < 5; i++) {
            const idx = i * 6;
            if (idx !== 12 && !cells[idx].classList.contains('marked')) {
                return false;
            }
        }
        
        // Anti-diagonal
        for (let i = 0; i < 5; i++) {
            const idx = i * 4 + 4;
            if (idx !== 12 && !cells[idx].classList.contains('marked')) {
                return false;
            }
        }
        
        return true;
    }
    
    static checkBlackout() {
        const cells = document.querySelectorAll('.cell');
        return Array.from(cells).every(cell => cell.classList.contains('marked'));
    }
    
    static checkPattern(pattern) {
        switch(pattern) {
            case 'line': return this.checkLineBingo();
            case 'four-corners': return this.checkFourCorners();
            case 'full-house': return this.checkFullHouse();
            case 'x': return this.checkXBingo();
            case 'blackout': return this.checkBlackout();
            default: return this.checkLineBingo();
        }
    }
}

// Error Handler
class ErrorHandler {
    static showError(message, type = 'error') {
        console.error(`Error: ${message}`);
        UIManager.showNotification(`Error: ${message}`, type);
    }
}

// Initialize game state
window.GameState = GameState;
window.GameSession = GameSession;
window.BingoPatterns = BingoPatterns;
window.ErrorHandler = ErrorHandler;
