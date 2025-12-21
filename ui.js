// UI Manager
class UIManager {
    static init() {
        this.createNumberGrid();
        this.createPatternSelector();
        this.updateUI();
        this.setupEventListeners();
    }
    
    static createNumberGrid() {
        const grid = document.getElementById('numberGrid');
        if (!grid) {
            ErrorHandler.showError('Number grid element not found');
            return;
        }
        
        grid.innerHTML = '';
        for (let i = 1; i <= 200; i++) {
            const button = document.createElement('button');
            button.className = 'num-btn';
            button.textContent = i;
            button.id = `num-${i}`;
            button.addEventListener('click', () => this.selectCenterNumber(i, button));
            grid.appendChild(button);
        }
    }
    
    static selectCenterNumber(number, button) {
        const state = GameState.getInstance();
        const session = GameSession;
        
        if (state.isPlaying) {
            this.showNotification('You are already in a game!', 'error');
            return;
        }
        
        if (!session.sessionActive) {
            this.showNotification('Session has ended. Please wait for next session.', 'error');
            return;
        }
        
        if (session.takenNumbers.has(number)) {
            this.showNotification('This number is already taken by another player!', 'error');
            this.updateTakenNumbers();
            return;
        }
        
        // Clear previous selection
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select new number
        state.selectedCenter = number;
        button.classList.add('selected');
        
        // Update label
        document.getElementById('selected-label').textContent = `CENTER: ${number}`;
        
        // Generate card
        this.generateCard(number);
        
        this.showNotification(`Selected center number: ${number}`, 'success');
    }
    
    static generateCard(centerNumber) {
        const state = GameState.getInstance();
        const grid = document.getElementById('cardGrid');
        
        if (!grid) {
            ErrorHandler.showError('Card grid element not found');
            return;
        }
        
        grid.innerHTML = '';
        const numbers = [];
        
        // Generate 25 numbers around center (12 on each side)
        for (let i = -12; i <= 12; i++) {
            let val = centerNumber + i;
            if (val < 1) val = 200 + val;
            if (val > 200) val = val - 200;
            numbers.push(val);
        }
        
        state.cardNumbers = numbers;
        
        // Create card cells
        numbers.forEach((n, i) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (i === 12) { // Center cell
                cell.textContent = 'FREE';
                cell.style.fontSize = '0.6rem';
                cell.style.background = 'var(--accent)';
                cell.style.color = 'white';
                state.markedCells.add('free');
            } else {
                cell.textContent = n;
                cell.dataset.val = n;
                
                // Check if this number has been drawn
                if (GameSession.drawnNumbers.includes(n)) {
                    cell.classList.add('marked');
                    state.markedCells.add(n.toString());
                }
            }
            
            grid.appendChild(cell);
        });
    }
    
    static createPatternSelector() {
        const container = document.getElementById('patternSelector');
        if (!container) return;
        
        container.innerHTML = '';
        
        const patterns = {
            'line': { name: 'LINE', multiplier: 5 },
            'four-corners': { name: 'FOUR CORNERS', multiplier: 3 },
            'full-house': { name: 'FULL HOUSE', multiplier: 10 },
            'x': { name: 'X PATTERN', multiplier: 7 },
            'blackout': { name: 'BLACKOUT', multiplier: 15 }
        };
        
        Object.entries(patterns).forEach(([key, pattern]) => {
            const button = document.createElement('button');
            button.className = `pattern-btn ${key === 'line' ? 'active' : ''}`;
            button.textContent = `${pattern.name} (${pattern.multiplier}x)`;
            button.addEventListener('click', () => this.selectPattern(key, button));
            container.appendChild(button);
        });
    }
    
    static selectPattern(pattern, button) {
        const state = GameState.getInstance();
        
        if (state.isPlaying) {
            this.showNotification('Cannot change pattern while playing', 'error');
            return;
        }
        
        // Clear previous selection
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Select new pattern
        state.currentPattern = pattern;
        button.classList.add('active');
        
        // Update label
        document.getElementById('pattern-label').textContent = 
            pattern.toUpperCase().replace('-', ' ');
        
        this.showNotification(`Selected pattern: ${pattern}`, 'success');
    }
    
    static updateUI() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        // Update balance
        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = state.balance.toLocaleString();
        }
        
        // Update wager displays
        document.getElementById('modalWager').textContent = state.wager;
        document.getElementById('wagerBtnLabel').textContent = state.wager;
        document.getElementById('modalBalance').textContent = state.balance;
        
        // Update session info
        const sessionInfo = session.getSessionInfo();
        document.getElementById('sessionCount').textContent = sessionInfo.sessionId;
        document.getElementById('sessionStatus').textContent = 
            sessionInfo.sessionActive ? 'ACTIVE' : 'ENDED';
        
        // Update game status
        const statusIndicator = document.getElementById('gameStatusIndicator');
        if (statusIndicator) {
            if (sessionInfo.sessionActive) {
                statusIndicator.className = 'game-status status-active';
                statusIndicator.textContent = 'ACTIVE';
            } else if (sessionInfo.waitingForNextSession) {
                statusIndicator.className = 'game-status status-waiting';
                statusIndicator.textContent = 'WAITING';
            } else {
                statusIndicator.className = 'game-status status-ended';
                statusIndicator.textContent = 'ENDED';
            }
        }
        
        // Update ball display
        const ballDisplay = document.getElementById('ballDisplay');
        if (ballDisplay) {
            if (sessionInfo.currentBall) {
                ballDisplay.textContent = sessionInfo.currentBall;
                ballDisplay.style.color = this.getRandomBallColor();
            } else {
                ballDisplay.textContent = '--';
                ballDisplay.style.color = 'var(--secondary)';
            }
        }
        
        // Update progress
        document.getElementById('drawCount').textContent = sessionInfo.drawCount;
        const progressPercent = (sessionInfo.drawCount / sessionInfo.maxDraws) * 100;
        document.getElementById('progressBar').style.width = `${progressPercent}%`;
        
        // Update multiplayer stats
        document.getElementById('activePlayers').textContent = sessionInfo.activePlayers;
        document.getElementById('totalCards').textContent = sessionInfo.totalCards;
        document.getElementById('winnersCount').textContent = sessionInfo.winnersCount;
        
        // Update taken numbers
        this.updateTakenNumbers();
        
        // Update history badge
        const historyBadge = document.getElementById('historyBadge');
        if (historyBadge) {
            const historyCount = HistoryManager.getHistoryCount();
            historyBadge.textContent = historyCount;
            historyBadge.style.display = historyCount > 0 ? 'flex' : 'none';
        }
        
        // Update start button state
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = state.isPlaying || !state.selectedCenter || !sessionInfo.sessionActive;
            startBtn.textContent = state.isPlaying ? 'PLAYING...' : 'JOIN SESSION';
        }
    }
    
    static updateTakenNumbers() {
        const session = GameSession;
        
        document.querySelectorAll('.num-btn').forEach(btn => {
            const num = parseInt(btn.textContent);
            if (session.takenNumbers.has(num)) {
                btn.classList.add('taken');
                btn.disabled = true;
            } else {
                btn.classList.remove('taken');
                btn.disabled = false;
            }
        });
    }
    
    static updateBallHistory() {
        const container = document.getElementById('historyBalls');
        if (!container) return;
        
        // Clear old history except recent balls
        const recentBalls = Array.from(container.querySelectorAll('.history-ball.recent'));
        
        // Keep only last 15 balls
        if (container.children.length > 15) {
            const ballsToRemove = Array.from(container.children)
                .slice(0, container.children.length - 15);
            ballsToRemove.forEach(ball => {
                if (!ball.classList.contains('recent')) {
                    ball.remove();
                }
            });
        }
    }
    
    static addBallToHistory(ball) {
        const container = document.getElementById('historyBalls');
        if (!container) return;
        
        const ballEl = document.createElement('div');
        ballEl.className = 'history-ball recent';
        ballEl.textContent = ball;
        ballEl.style.backgroundColor = this.getRandomBallColor();
        
        container.appendChild(ballEl);
        
        // Remove recent class after animation
        setTimeout(() => {
            ballEl.classList.remove('recent');
        }, 1000);
        
        this.updateBallHistory();
    }
    
    static getRandomBallColor() {
        const colors = [
            '#10b981', '#6366f1', '#f59e0b', '#ef4444',
            '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    static setupEventListeners() {
        // Wager modal toggle
        const wagerModal = document.getElementById('wagerModal');
        if (wagerModal) {
            wagerModal.addEventListener('click', (e) => {
                if (e.target === wagerModal) {
                    this.toggleWagerModal();
                }
            });
        }
        
        // History modal toggle
        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
            historyModal.addEventListener('click', (e) => {
                if (e.target === historyModal) {
                    this.closeHistoryModal();
                }
            });
        }
        
        // Error modal close
        const errorModal = document.getElementById('errorModal');
        if (errorModal) {
            errorModal.addEventListener('click', (e) => {
                if (e.target === errorModal) {
                    this.closeErrorModal();
                }
            });
        }
        
        // Game state validation on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.validateGameState();
            }
        });
    }
    
    static toggleWagerModal() {
        const modal = document.getElementById('wagerModal');
        modal.classList.toggle('active');
    }
    
    static changeWager(amount) {
        const state = GameState.getInstance();
        const newWager = state.wager + amount;
        
        if (newWager < 10 || newWager > 500) {
            this.showNotification('Wager must be between 10 and 500', 'error');
            return;
        }
        
        if (newWager > state.balance) {
            this.showNotification('Wager cannot exceed balance', 'error');
            return;
        }
        
        state.wager = newWager;
        this.updateUI();
        
        this.showNotification(`Wager set to ${newWager}`, 'success');
    }
    
    static joinSession() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        // Validate game state
        const validation = state.validateGameState();
        if (validation.length > 0) {
            validation.forEach(error => {
                this.showNotification(error, 'error');
            });
            return;
        }
        
        // Check preconditions
        if (!state.selectedCenter) {
            this.showNotification('Please select a center number first!', 'error');
            return;
        }
        
        if (!session.sessionActive) {
            this.showNotification('Session has ended. Please wait for next session.', 'error');
            return;
        }
        
        if (session.takenNumbers.has(state.selectedCenter)) {
            this.showNotification('This number is now taken! Please choose another.', 'error');
            this.updateTakenNumbers();
            return;
        }
        
        const canWager = state.canPlaceWager();
        if (!canWager.success) {
            this.showNotification(canWager.reason, 'error');
            return;
        }
        
        try {
            // Deduct wager
            state.updateBalance(-state.wager);
            
            // Reserve the number
            if (!session.takeNumber(state.selectedCenter)) {
                throw new Error('Failed to reserve number');
            }
            
            // Update player state
            state.isPlaying = true;
            state.hasJoinedSession = true;
            state.sessionWon = false;
            state.markedCells.clear();
            state.markedCells.add('free');
            
            // Mark center cell
            const centerCell = document.querySelector('.cell[style*="background: var(--accent)"]');
            if (centerCell) centerCell.classList.add('marked');
            
            // Mark any numbers already drawn
            const cells = document.querySelectorAll('.cell');
            cells.forEach(c => {
                if (c.dataset.val && session.drawnNumbers.includes(parseInt(c.dataset.val))) {
                    state.markedCells.add(c.dataset.val);
                    c.classList.add('marked');
                }
            });
            
            this.updateUI();
            this.updateTakenNumbers();
            
            this.showNotification(`Joined session with number ${state.selectedCenter}`, 'success');
            
            // Log game start
            state.addGameRecord({
                type: 'game_start',
                wager: state.wager,
                centerNumber: state.selectedCenter,
                pattern: state.currentPattern
            });
            
        } catch (error) {
            ErrorHandler.showError(`Failed to join session: ${error.message}`);
            state.updateBalance(state.wager); // Refund on error
        }
    }
    
    static resetPlayerGame() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        if (state.isPlaying && !confirm("Leave current game? Your wager will be lost.")) {
            return;
        }
        
        if (state.isPlaying) {
            session.releaseNumber(state.selectedCenter);
            
            // Add to history
            state.addGameRecord({
                type: 'game_quit',
                wager: state.wager,
                draws: session.drawCount
            });
        }
        
        state.reset();
        this.updateUI();
        this.updateTakenNumbers();
        
        this.showNotification('Left the game', 'info');
    }
    
    static showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
    
    static toggleGameHistory() {
        const modal = document.getElementById('historyModal');
        modal.classList.add('active');
        
        // Load history data
        HistoryManager.loadHistory();
        StatsManager.updateHotNumbers();
    }
    
    static closeHistoryModal() {
        const modal = document.getElementById('historyModal');
        modal.classList.remove('active');
    }
    
    static switchHistoryTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.history-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.history-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const tabElement = document.getElementById(`${tabName}Tab`);
        if (tabElement) {
            tabElement.style.display = 'block';
        }
        
        // Activate selected tab button
        const tabButtons = document.querySelectorAll('.history-tab');
        tabButtons.forEach(button => {
            if (button.textContent.toLowerCase().includes(tabName)) {
                button.classList.add('active');
            }
        });
        
        // Update tab content
        if (tabName === 'winners') {
            HistoryManager.displayWinners();
        } else if (tabName === 'numbers') {
            StatsManager.displayHotNumbersAnalysis();
        } else if (tabName === 'stats') {
            StatsManager.displayStatistics();
        }
    }
    
    static closeErrorModal() {
        const modal = document.getElementById('errorModal');
        modal.classList.remove('active');
    }
    
    static validateGameState() {
        const state = GameState.getInstance();
        const errors = state.validateGameState();
        
        if (errors.length > 0) {
            errors.forEach(error => {
                this.showNotification(`Game state error: ${error}`, 'error');
            });
            return false;
        }
        
        return true;
    }
    
    static updateFromGameSession() {
        const session = GameSession;
        
        // Update ball display if new ball drawn
        if (session.currentBall) {
            this.addBallToHistory(session.currentBall);
        }
        
        // Update progress
        this.updateUI();
        
        // Check for player win
        if (GameState.getInstance().isPlaying) {
            this.checkPlayerWin();
        }
    }
    
    static checkPlayerWin() {
        const state = GameState.getInstance();
        const patternCheckers = window.bingoPatterns || {};
        
        if (state.currentPattern && patternCheckers[state.currentPattern]) {
            if (patternCheckers[state.currentPattern]()) {
                this.processWin();
            }
        }
    }
    
    static processWin() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        state.sessionWon = true;
        state.isPlaying = false;
        state.hasJoinedSession = false;
        
        const patternMultipliers = {
            'line': 5,
            'four-corners': 3,
            'full-house': 10,
            'x': 7,
            'blackout': 15
        };
        
        const multiplier = patternMultipliers[state.currentPattern] || 5;
        const winnings = state.wager * multiplier;
        
        // Update balance
        state.updateBalance(winnings);
        
        // Add to history
        const winnerRecord = {
            type: 'win',
            wager: state.wager,
            winnings: winnings,
            pattern: state.currentPattern,
            draws: session.drawCount,
            centerNumber: state.selectedCenter,
            cardNumbers: state.cardNumbers
        };
        
        state.addGameRecord(winnerRecord);
        HistoryManager.addWinner(winnerRecord);
        
        // Show win modal
        document.getElementById('winAmount').textContent = `+${winnings}`;
        document.getElementById('winPattern').textContent = state.currentPattern.toUpperCase();
        document.getElementById('winDraws').textContent = session.drawCount;
        document.getElementById('winWager').textContent = state.wager;
        document.getElementById('winModal').classList.add('active');
        
        // Release number
        session.releaseNumber(state.selectedCenter);
        
        this.showNotification(`BINGO! You won ${winnings} credits!`, 'success');
        this.updateUI();
    }
    
    static showLoseModal() {
        const state = GameState.getInstance();
        document.getElementById('loseAmount').textContent = `-${state.wager}`;
        document.getElementById('loseModal').classList.add('active');
        
        // Add to history
        state.addGameRecord({
            type: 'loss',
            wager: state.wager,
            draws: GameSession.drawCount
        });
    }
    
    static closeWinModal() {
        document.getElementById('winModal').classList.remove('active');
        GameState.getInstance().reset();
        this.updateUI();
    }
    
    static closeLoseModal() {
        document.getElementById('loseModal').classList.remove('active');
        GameState.getInstance().reset();
        this.updateUI();
    }
}

// Initialize UI when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        UIManager.init();
    });
} else {
    UIManager.init();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}