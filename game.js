// Game State Management - Singleton Pattern
class GameManager {
    static instance = null;
    
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    
    constructor() {
        this.resetState();
    }
    
    resetState() {
        // Player state
        this.balance = 1000;
        this.wager = 50;
        this.selectedNumber = null;
        this.pattern = 'line';
        this.isPlaying = false;
        this.hasCard = false;
        this.cardNumbers = [];
        this.markedNumbers = new Set();
        this.sessionWon = false;
        
        // Session state
        this.currentPhase = 'drawing'; // 'drawing' or 'picking'
        this.currentSession = 1;
        this.drawsCompleted = 0;
        this.maxDraws = 75;
        this.drawnNumbers = [];
        this.winners = [];
        this.takenNumbers = new Set();
        this.activePlayers = 0;
        this.sessionId = `session_${Date.now()}`;
        this.totalCards = 0;
        
        // Timer state
        this.drawingTimer = null;
        this.pickingTimer = null;
        this.timeLeft = 60;
        
        // Call history
        this.callHistory = [];
    }
    
    static start() {
        const instance = this.getInstance();
        instance.clearTimers();
        instance.startDrawingPhase();
    }
    
    startDrawingPhase() {
        this.currentPhase = 'drawing';
        this.drawsCompleted = 0;
        this.drawnNumbers = [];
        this.callHistory = [];
        this.sessionWon = false;
        
        // Clear any existing card
        this.hasCard = false;
        this.cardNumbers = [];
        this.markedNumbers.clear();
        
        // Update UI
        UIManager.updatePhaseUI();
        UIManager.updateCallDisplay('B', '-', 'Waiting...');
        
        // Start drawing numbers
        this.drawingTimer = setInterval(() => {
            this.drawNumber();
        }, 1000);
        
        // Update phase badge
        document.getElementById('phaseBadge').className = 'phase-badge drawing';
        document.getElementById('phaseBadge').innerHTML = '🔴 DRAWING';
        
        // Show phase message
        document.getElementById('phaseMessage').innerHTML = `
            <div class="phase-icon">⏳</div>
            <div class="phase-text">Numbers being drawn. Join next session in <span id="joinTimer">${this.timeLeft}</span>s</div>
        `;
        
        // Disable number selection
        document.getElementById('numberSelectTitle').innerHTML = '🔒 Number Selection LOCKED';
        document.getElementById('numberSelectSubtitle').innerHTML = 'Wait for join phase';
        document.querySelector('.selector-box').classList.add('disabled');
        document.querySelector('.numbers-scroll').classList.add('disabled');
        document.getElementById('joinBtn').disabled = true;
    }
    
    drawNumber() {
        if (this.drawsCompleted >= this.maxDraws) {
            this.endDrawingPhase();
            return;
        }
        
        // Check if all numbers are drawn (prevent infinite loop)
        if (this.drawnNumbers.length >= 200) {
            console.log('All numbers have been drawn!');
            this.endDrawingPhase();
            return;
        }
        
        // Generate unique number
        let number;
        let attempts = 0;
        const maxAttempts = 200;
        
        do {
            number = Math.floor(Math.random() * 200) + 1;
            attempts++;
            
            if (attempts > maxAttempts) {
                console.error('Failed to find unique number');
                this.endDrawingPhase();
                return;
            }
        } while (this.drawnNumbers.includes(number));
        
        // Add to drawn numbers
        this.drawnNumbers.push(number);
        this.drawsCompleted++;
        
        // Get letter for this number
        const letter = this.getLetterForNumber(number);
        const call = `${letter}-${number}`;
        
        // Add to call history
        this.callHistory.unshift({
            call: call,
            letter: letter,
            number: number,
            timestamp: Date.now()
        });
        
        // Keep only last 20 calls
        if (this.callHistory.length > 20) {
            this.callHistory.pop();
        }
        
        // Update UI with announcement
        UIManager.updateCallDisplay(letter, number, call);
        
        // Mark cards for all playing players
        this.markPlayerCards(number);
        
        // Check for winners
        this.checkWinners();
        
        // Update progress
        UIManager.updateProgress();
        
        // Update stats
        UIManager.updateStats();
        
        // Update call counter
        document.getElementById('callCounter').textContent = `#${this.drawsCompleted}`;
        
        // Record draw in stats
        StatsManager.recordDraw(number);
        
        // If this is the last draw, end phase
        if (this.drawsCompleted >= this.maxDraws) {
            this.endDrawingPhase();
        }
    }
    
    getLetterForNumber(number) {
        if (number <= 40) return 'B';
        if (number <= 80) return 'I';
        if (number <= 120) return 'N';
        if (number <= 160) return 'G';
        return 'O';
    }
    
    markPlayerCards(number) {
        if (this.isPlaying && this.hasCard) {
            // Check if this number is on player's card
            if (this.cardNumbers.includes(number)) {
                this.markedNumbers.add(number);
                UIManager.markCardCell(number);
                
                // Check if player won
                this.checkPlayerWin();
            }
        }
    }
    
    checkPlayerWin() {
        if (!this.isPlaying || !this.hasCard) return;
        
        // Get pattern checker
        const patternChecker = BingoPatterns.patterns[this.pattern]?.check;
        
        if (patternChecker && patternChecker()) {
            this.playerWins();
        }
    }
    
    playerWins() {
        // Calculate winnings
        const multipliers = {
            'line': 5,
            'four-corners': 3,
            'full-house': 10,
            'x': 7,
            'blackout': 15
        };
        
        const multiplier = multipliers[this.pattern] || 5;
        const winnings = this.wager * multiplier;
        
        // Add to balance
        this.balance += winnings;
        this.sessionWon = true;
        this.isPlaying = false;
        this.hasCard = false;
        
        // Add to winners list
        this.winners.push({
            player: 'You',
            number: this.selectedNumber,
            pattern: this.pattern,
            winnings: winnings,
            draws: this.drawsCompleted
        });
        
        // Record win in history
        HistoryManager.addWinner({
            player: 'You',
            number: this.selectedNumber,
            pattern: this.pattern,
            winnings: winnings,
            draws: this.drawsCompleted,
            cardNumbers: this.cardNumbers
        });
        
        // Record win in stats
        StatsManager.recordPlayerWin(this.wager, winnings, this.pattern, this.drawsCompleted);
        
        // Show win modal
        UIManager.showWinModal(winnings);
        
        // Release the number
        this.takenNumbers.delete(this.selectedNumber);
        this.selectedNumber = null;
        
        // Update UI
        UIManager.updateUI();
        
        // Update multiplayer
        MultiplayerManager.updatePlayerStats({
            wins: this.winners.length,
            balance: this.balance
        });
    }
    
    checkWinners() {
        // Simulate other winners (for multiplayer feel)
        if (Math.random() < 0.02 && this.drawsCompleted > 30) {
            this.winnersCount++;
            this.activePlayers = Math.max(0, this.activePlayers - 1);
            UIManager.updateStats();
        }
    }
    
    endDrawingPhase() {
        // Clear drawing timer
        clearInterval(this.drawingTimer);
        
        // Check if player lost
        if (this.isPlaying && !this.sessionWon) {
            this.playerLoses();
        }
        
        // Start picking phase after delay
        setTimeout(() => {
            this.startPickingPhase();
        }, 2000);
    }
    
    playerLoses() {
        this.isPlaying = false;
        this.hasCard = false;
        this.sessionWon = false;
        
        // Deduct wager
        this.balance -= this.wager;
        
        // Record loss in history
        HistoryManager.addGameRecord({
            type: 'loss',
            wager: this.wager,
            pattern: this.pattern,
            draws: this.drawsCompleted
        });
        
        // Record loss in stats
        StatsManager.recordPlayerLoss(this.wager);
        
        // Release the number
        this.takenNumbers.delete(this.selectedNumber);
        this.selectedNumber = null;
        
        // Clear marked numbers
        this.markedNumbers.clear();
        
        // Show lose modal
        UIManager.showLoseModal();
        
        // Update UI
        UIManager.updateUI();
    }
    
    startPickingPhase() {
        this.currentPhase = 'picking';
        this.timeLeft = 60; // 60 seconds to pick numbers
        
        // Reset for new session
        this.drawsCompleted = 0;
        this.drawnNumbers = [];
        this.callHistory = [];
        this.sessionWon = false;
        this.currentSession++;
        
        // Update UI
        UIManager.updatePhaseUI();
        
        // Update phase badge
        document.getElementById('phaseBadge').className = 'phase-badge picking';
        document.getElementById('phaseBadge').innerHTML = '🟢 PICKING';
        
        // Enable number selection
        document.getElementById('numberSelectTitle').innerHTML = '✅ Number Selection OPEN';
        document.getElementById('numberSelectSubtitle').innerHTML = '60s to pick your number';
        document.querySelector('.selector-box').classList.remove('disabled');
        document.querySelector('.numbers-scroll').classList.remove('disabled');
        
        // Show join phase modal
        UIManager.showJoinPhaseModal();
        
        // Start picking timer
        this.pickingTimer = setInterval(() => {
            this.timeLeft--;
            
            // Update timers
            document.getElementById('joinTimer').textContent = this.timeLeft;
            document.getElementById('nextSessionTimer').textContent = this.formatTime(this.timeLeft);
            document.getElementById('phaseTimer').textContent = this.timeLeft;
            
            if (this.timeLeft <= 10) {
                // Warning: Last 10 seconds
                document.getElementById('nextSessionTimer').style.color = 'var(--danger)';
            }
            
            if (this.timeLeft <= 0) {
                clearInterval(this.pickingTimer);
                this.endPickingPhase();
            }
        }, 1000);
    }
    
    endPickingPhase() {
        // Disable number selection
        document.getElementById('numberSelectTitle').innerHTML = '🔒 Number Selection LOCKED';
        document.getElementById('numberSelectSubtitle').innerHTML = 'Wait for next join phase';
        document.querySelector('.selector-box').classList.add('disabled');
        document.querySelector('.numbers-scroll').classList.add('disabled');
        document.getElementById('joinBtn').disabled = true;
        
        // Hide join confirmation if visible
        document.getElementById('joinConfirm').style.display = 'none';
        
        // Start new drawing phase
        setTimeout(() => {
            this.startDrawingPhase();
        }, 2000);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    clearTimers() {
        if (this.drawingTimer) clearInterval(this.drawingTimer);
        if (this.pickingTimer) clearInterval(this.pickingTimer);
    }
    
    selectNumber(number) {
        // Can only select during picking phase
        if (this.currentPhase !== 'picking') {
            UIManager.showNotification('Can only pick numbers during join phase!', 'error');
            return false;
        }
        
        // Check if number is available
        if (this.takenNumbers.has(number)) {
            UIManager.showNotification('Number already taken!', 'error');
            return false;
        }
        
        // Select the number
        this.selectedNumber = number;
        
        // Generate card
        this.generateCard(number);
        
        // Enable join button
        document.getElementById('joinBtn').disabled = false;
        
        // Update confirmation display
        document.getElementById('confirmNumber').textContent = number;
        document.getElementById('confirmPattern').textContent = this.pattern.toUpperCase();
        document.getElementById('confirmWager').textContent = this.wager;
        
        return true;
    }
    
    generateCard(centerNumber) {
        // Generate 25 unique numbers around the center
        const numbers = new Set();
        const range = 12; // 12 numbers on each side
        
        // Add center as FREE
        numbers.add(0);
        
        // Generate numbers ensuring uniqueness
        while (numbers.size < 25) {
            const offset = Math.floor(Math.random() * (range * 2 + 1)) - range;
            let num = centerNumber + offset;
            
            // Wrap around 1-200
            if (num < 1) num = 200 + num;
            if (num > 200) num = num - 200;
            
            numbers.add(num);
        }
        
        this.cardNumbers = Array.from(numbers);
        
        // Update card display
        UIManager.updateCard(this.cardNumbers);
    }
    
    joinSession() {
        // Validation
        if (this.currentPhase !== 'picking') {
            UIManager.showNotification('Can only join during join phase!', 'error');
            return false;
        }
        
        if (!this.selectedNumber) {
            UIManager.showNotification('Please select a number first!', 'error');
            return false;
        }
        
        if (this.takenNumbers.has(this.selectedNumber)) {
            UIManager.showNotification('Number already taken!', 'error');
            return false;
        }
        
        if (this.balance < this.wager) {
            UIManager.showNotification('Insufficient balance!', 'error');
            return false;
        }
        
        // Deduct wager
        this.balance -= this.wager;
        
        // Take the number
        this.takenNumbers.add(this.selectedNumber);
        
        // Set player state
        this.isPlaying = true;
        this.hasCard = true;
        this.sessionWon = false;
        
        // Mark free space
        this.markedNumbers.add(0);
        
        // Update stats
        this.activePlayers++;
        this.totalCards = this.takenNumbers.size;
        
        // Record join in history
        HistoryManager.addGameRecord({
            type: 'join',
            number: this.selectedNumber,
            wager: this.wager,
            pattern: this.pattern,
            timestamp: Date.now()
        });
        
        // Update UI
        UIManager.updateUI();
        UIManager.showNotification(`Joined with number ${this.selectedNumber}!`, 'success');
        
        // Hide confirmation
        document.getElementById('joinConfirm').style.display = 'none';
        
        return true;
    }
    
    setPattern(pattern) {
        if (!BingoPatterns.patterns[pattern]) {
            console.error(`Invalid pattern: ${pattern}`);
            return false;
        }
        
        this.pattern = pattern;
        return true;
    }
    
    setWager(amount) {
        // Validate wager
        if (amount < 10 || amount > 500) {
            return false;
        }
        
        if (amount > this.balance) {
            return false;
        }
        
        this.wager = amount;
        return true;
    }
    
    // Static helper methods
    static getLetterColor(letter) {
        const colors = {
            'B': '#3b82f6',
            'I': '#6366f1',
            'N': '#10b981',
            'G': '#f59e0b',
            'O': '#ef4444'
        };
        return colors[letter] || '#94a3b8';
    }
}

// Make globally available
window.GameManager = GameManager;
