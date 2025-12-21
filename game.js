// Game State Management
class GameManager {
    static instance = null;
    
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = {
                // Player state
                balance: 1000,
                wager: 50,
                selectedNumber: null,
                pattern: 'line',
                isPlaying: false,
                hasCard: false,
                cardNumbers: [],
                markedNumbers: new Set(),
                sessionWon: false,
                
                // Session state
                currentPhase: 'drawing', // 'drawing' or 'picking'
                currentSession: 1,
                drawsCompleted: 0,
                maxDraws: 75,
                drawnNumbers: [],
                winners: [],
                takenNumbers: new Set(),
                activePlayers: 0,
                
                // Timer state
                drawingTimer: null,
                pickingTimer: null,
                timeLeft: 60,
                
                // Call history
                callHistory: []
            };
        }
        return GameManager.instance;
    }
    
    static start() {
        const state = this.getInstance();
        
        // Clear any existing timers
        this.clearTimers();
        
        // Start the first drawing phase
        this.startDrawingPhase();
    }
    
    static startDrawingPhase() {
        const state = this.getInstance();
        state.currentPhase = 'drawing';
        state.drawsCompleted = 0;
        state.drawnNumbers = [];
        state.callHistory = [];
        
        // Update UI
        UIManager.updatePhaseUI();
        UIManager.updateCallDisplay('-', '-', 'Waiting...');
        
        // Start drawing numbers (every 1 second)
        state.drawingTimer = setInterval(() => {
            this.drawNumber();
        }, 1000);
        
        // Update phase badge
        document.getElementById('phaseBadge').className = 'phase-badge drawing';
        document.getElementById('phaseBadge').innerHTML = '🔴 DRAWING';
        
        // Show phase message
        document.getElementById('phaseMessage').innerHTML = `
            <div class="phase-icon">⏳</div>
            <div class="phase-text">Numbers being drawn. Join next session in <span id="joinTimer">${state.timeLeft}</span>s</div>
        `;
    }
    
    static drawNumber() {
        const state = this.getInstance();
        
        if (state.drawsCompleted >= state.maxDraws) {
            this.endDrawingPhase();
            return;
        }
        
        // Generate unique number
        let number;
        do {
            number = Math.floor(Math.random() * 200) + 1;
        } while (state.drawnNumbers.includes(number));
        
        // Add to drawn numbers
        state.drawnNumbers.push(number);
        state.drawsCompleted++;
        
        // Get letter for this number
        const letter = this.getLetterForNumber(number);
        const call = `${letter}${number}`;
        
        // Add to call history
        state.callHistory.unshift({
            call: call,
            letter: letter,
            number: number,
            timestamp: Date.now()
        });
        
        // Keep only last 20 calls
        if (state.callHistory.length > 20) {
            state.callHistory.pop();
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
        document.getElementById('callCounter').textContent = `#${state.drawsCompleted}`;
        
        // If this is the last draw, end phase
        if (state.drawsCompleted >= state.maxDraws) {
            this.endDrawingPhase();
        }
    }
    
    static getLetterForNumber(number) {
        if (number <= 40) return 'B';
        if (number <= 80) return 'I';
        if (number <= 120) return 'N';
        if (number <= 160) return 'G';
        return 'O';
    }
    
    static markPlayerCards(number) {
        const state = this.getInstance();
        
        if (state.isPlaying && state.hasCard) {
            // Check if this number is on player's card
            if (state.cardNumbers.includes(number)) {
                state.markedNumbers.add(number);
                UIManager.markCardCell(number);
                
                // Check if player won
                this.checkPlayerWin();
            }
        }
    }
    
    static checkPlayerWin() {
        const state = this.getInstance();
        
        if (!state.isPlaying || !state.hasCard) return;
        
        // Get pattern checker
        const patternChecker = this.getPatternChecker(state.pattern);
        
        if (patternChecker()) {
            this.playerWins();
        }
    }
    
    static getPatternChecker(pattern) {
        const checkers = {
            'line': () => this.checkLinePattern(),
            'four-corners': () => this.checkFourCornersPattern(),
            'full-house': () => this.checkFullHousePattern(),
            'x': () => this.checkXPattern(),
            'blackout': () => this.checkBlackoutPattern()
        };
        
        return checkers[pattern] || checkers.line;
    }
    
    static checkLinePattern() {
        const state = this.getInstance();
        const card = state.cardNumbers;
        
        // Check rows (BINGO card is 5x5)
        for (let row = 0; row < 5; row++) {
            let complete = true;
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                if (index === 12) continue; // Skip free space
                if (!state.markedNumbers.has(card[index])) {
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
                const index = row * 5 + col;
                if (index === 12) continue;
                if (!state.markedNumbers.has(card[index])) {
                    complete = false;
                    break;
                }
            }
            if (complete) return true;
        }
        
        return false;
    }
    
    static checkFourCornersPattern() {
        const state = this.getInstance();
        const corners = [0, 4, 20, 24]; // Indices of corners
        const card = state.cardNumbers;
        
        return corners.every(index => {
            if (index === 12) return true; // Center is free
            return state.markedNumbers.has(card[index]);
        });
    }
    
    static checkFullHousePattern() {
        const state = this.getInstance();
        const card = state.cardNumbers;
        
        // All 25 cells must be marked
        return card.every((number, index) => {
            if (index === 12) return true; // Center is always free
            return state.markedNumbers.has(number);
        });
    }
    
    static checkXPattern() {
        const state = this.getInstance();
        const card = state.cardNumbers;
        
        // Main diagonal
        for (let i = 0; i < 5; i++) {
            const index = i * 6;
            if (index === 12) continue; // Skip center
            if (!state.markedNumbers.has(card[index])) {
                return false;
            }
        }
        
        // Anti-diagonal
        for (let i = 0; i < 5; i++) {
            const index = i * 4 + 4;
            if (index === 12) continue; // Skip center
            if (!state.markedNumbers.has(card[index])) {
                return false;
            }
        }
        
        return true;
    }
    
    static checkBlackoutPattern() {
        const state = this.getInstance();
        const card = state.cardNumbers;
        
        // All numbers including center (center is free so always marked)
        return card.every(number => {
            if (number === 0) return true; // Center
            return state.markedNumbers.has(number);
        });
    }
    
    static playerWins() {
        const state = this.getInstance();
        
        // Calculate winnings
        const multipliers = {
            'line': 5,
            'four-corners': 3,
            'full-house': 10,
            'x': 7,
            'blackout': 15
        };
        
        const multiplier = multipliers[state.pattern] || 5;
        const winnings = state.wager * multiplier;
        
        // Add to balance
        state.balance += winnings;
        state.sessionWon = true;
        state.isPlaying = false;
        state.hasCard = false;
        
        // Add to winners list
        state.winners.push({
            player: 'You',
            number: state.selectedNumber,
            pattern: state.pattern,
            winnings: winnings,
            draws: state.drawsCompleted
        });
        
        // Show win modal
        UIManager.showWinModal(winnings);
        
        // Release the number
        state.takenNumbers.delete(state.selectedNumber);
        state.selectedNumber = null;
        
        // Update UI
        UIManager.updateUI();
    }
    
    static checkWinners() {
        const state = this.getInstance();
        
        // Simulate other winners (for multiplayer feel)
        if (Math.random() < 0.02 && state.drawsCompleted > 30) {
            state.winnersCount++;
            state.activePlayers = Math.max(0, state.activePlayers - 1);
            UIManager.updateStats();
        }
    }
    
    static endDrawingPhase() {
        const state = this.getInstance();
        
        // Clear drawing timer
        clearInterval(state.drawingTimer);
        
        // Check if player lost
        if (state.isPlaying && !state.sessionWon) {
            this.playerLoses();
        }
        
        // Start picking phase
        this.startPickingPhase();
    }
    
    static playerLoses() {
        const state = this.getInstance();
        
        state.isPlaying = false;
        state.hasCard = false;
        state.sessionWon = false;
        
        // Release the number
        state.takenNumbers.delete(state.selectedNumber);
        state.selectedNumber = null;
        
        // Clear marked numbers
        state.markedNumbers.clear();
        
        // Show lose modal
        UIManager.showLoseModal();
    }
    
    static startPickingPhase() {
        const state = this.getInstance();
        state.currentPhase = 'picking';
        state.timeLeft = 60; // 60 seconds to pick numbers
        
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
        state.pickingTimer = setInterval(() => {
            state.timeLeft--;
            
            // Update timers
            document.getElementById('joinTimer').textContent = state.timeLeft;
            document.getElementById('nextSessionTimer').textContent = this.formatTime(state.timeLeft);
            document.getElementById('phaseTimer').textContent = state.timeLeft;
            
            if (state.timeLeft <= 10) {
                // Warning: Last 10 seconds
                document.getElementById('nextSessionTimer').style.color = 'var(--danger)';
            }
            
            if (state.timeLeft <= 0) {
                clearInterval(state.pickingTimer);
                this.endPickingPhase();
            }
        }, 1000);
    }
    
    static endPickingPhase() {
        const state = this.getInstance();
        
        // Disable number selection
        document.getElementById('numberSelectTitle').innerHTML = '🔒 Number Selection LOCKED';
        document.getElementById('numberSelectSubtitle').innerHTML = 'Wait for next join phase';
        document.querySelector('.selector-box').classList.add('disabled');
        document.querySelector('.numbers-scroll').classList.add('disabled');
        
        // Disable join button
        document.getElementById('joinBtn').disabled = true;
        
        // Increment session number
        state.currentSession++;
        
        // Reset for next session
        state.sessionWon = false;
        state.markedNumbers.clear();
        state.callHistory = [];
        
        // Start new drawing phase
        setTimeout(() => {
            this.startDrawingPhase();
        }, 2000); // 2 second delay before next draw
    }
    
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    static clearTimers() {
        const state = this.getInstance();
        if (state.drawingTimer) clearInterval(state.drawingTimer);
        if (state.pickingTimer) clearInterval(state.pickingTimer);
    }
    
    static selectNumber(number) {
        const state = this.getInstance();
        
        // Can only select during picking phase
        if (state.currentPhase !== 'picking') {
            UIManager.showNotification('Can only pick numbers during join phase!', 'error');
            return false;
        }
        
        // Check if number is available
        if (state.takenNumbers.has(number)) {
            UIManager.showNotification('Number already taken!', 'error');
            return false;
        }
        
        // Select the number
        state.selectedNumber = number;
        
        // Generate card
        this.generateCard(number);
        
        // Enable join button
        document.getElementById('joinBtn').disabled = false;
        
        // Update confirmation display
        document.getElementById('confirmNumber').textContent = number;
        document.getElementById('confirmPattern').textContent = state.pattern.toUpperCase();
        document.getElementById('confirmWager').textContent = state.wager;
        
        return true;
    }
    
    static generateCard(centerNumber) {
        const state = this.getInstance();
        
        // Generate 25 numbers around the center
        const numbers = [];
        for (let i = -12; i <= 12; i++) {
            let num = centerNumber + i;
            
            // Wrap around 1-200
            if (num < 1) num = 200 + num;
            if (num > 200) num = num - 200;
            
            numbers.push(num);
        }
        
        // Set center (index 12) to 0 to mark as FREE
        numbers[12] = 0;
        
        state.cardNumbers = numbers;
        
        // Update card display
        UIManager.updateCard(numbers);
    }
    
    static joinNextSession() {
        const state = this.getInstance();
        
        // Validation
        if (state.currentPhase !== 'picking') {
            UIManager.showNotification('Can only join during join phase!', 'error');
            return false;
        }
        
        if (!state.selectedNumber) {
            UIManager.showNotification('Please select a number first!', 'error');
            return false;
        }
        
        if (state.takenNumbers.has(state.selectedNumber)) {
            UIManager.showNotification('Number already taken!', 'error');
            return false;
        }
        
        if (state.balance < state.wager) {
            UIManager.showNotification('Insufficient balance!', 'error');
            return false;
        }
        
        // Deduct wager
        state.balance -= state.wager;
        
        // Take the number
        state.takenNumbers.add(state.selectedNumber);
        
        // Set player state
        state.isPlaying = true;
        state.hasCard = true;
        state.sessionWon = false;
        
        // Mark free space
        state.markedNumbers.add(0);
        
        // Update stats
        state.activePlayers++;
        
        // Update UI
        UIManager.updateUI();
        UIManager.showNotification(`Joined with number ${state.selectedNumber}!`, 'success');
        
        // Hide confirmation
        document.getElementById('joinConfirm').style.display = 'none';
        
        return true;
    }
    
    static setPattern(pattern) {
        const state = this.getInstance();
        state.pattern = pattern;
        return true;
    }
    
    static setWager(amount) {
        const state = this.getInstance();
        
        // Validate wager
        if (amount < 10 || amount > 500) {
            return false;
        }
        
        if (amount > state.balance) {
            return false;
        }
        
        state.wager = amount;
        return true;
    }
}

// Make globally available
window.GameManager = GameManager;
