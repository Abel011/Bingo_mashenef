// UI Manager
class UIManager {
    static init() {
        console.log('Initializing UI...');
        
        // Create number grid
        this.createNumberGrid();
        
        // Create pattern selector
        this.createPatternSelector();
        
        // Create bingo card
        this.createBingoCard();
        
        // Initialize UI state
        this.updateUI();
        this.updateStats();
        this.updatePhaseUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('UI initialized successfully');
    }
    
    static createNumberGrid() {
        const grid = document.getElementById('numberGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (let i = 1; i <= 200; i++) {
            const btn = document.createElement('button');
            btn.className = 'num-btn';
            btn.textContent = i;
            btn.id = `num-${i}`;
            
            // Color code by BINGO column
            const letter = this.getLetterForNumber(i);
            btn.style.borderLeftColor = GameManager.getLetterColor(letter);
            btn.style.borderLeftWidth = '3px';
            
            btn.onclick = () => this.selectNumber(i, btn);
            grid.appendChild(btn);
        }
    }
    
    static getLetterForNumber(number) {
        if (number <= 40) return 'B';
        if (number <= 80) return 'I';
        if (number <= 120) return 'N';
        if (number <= 160) return 'G';
        return 'O';
    }
    
    static selectNumber(number, button) {
        const game = GameManager.getInstance();
        
        if (game.selectNumber(number)) {
            // Clear previous selection
            document.querySelectorAll('.num-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Select new number
            button.classList.add('selected');
            
            // Show confirmation
            document.getElementById('joinConfirm').style.display = 'block';
            document.getElementById('cardStatus').textContent = 'Ready to Join';
            
            this.showNotification(`Selected number ${number}`, 'success');
        }
    }
    
    static createPatternSelector() {
        const container = document.getElementById('patternSelector');
        if (!container) return;
        
        const patterns = [
            { id: 'line', name: 'LINE', multiplier: 5 },
            { id: 'four-corners', name: 'FOUR CORNERS', multiplier: 3 },
            { id: 'full-house', name: 'FULL HOUSE', multiplier: 10 },
            { id: 'x', name: 'X PATTERN', multiplier: 7 },
            { id: 'blackout', name: 'BLACKOUT', multiplier: 15 }
        ];
        
        container.innerHTML = '';
        
        patterns.forEach(pattern => {
            const btn = document.createElement('button');
            btn.className = `pattern-btn ${pattern.id === 'line' ? 'active' : ''}`;
            btn.textContent = `${pattern.name} (${pattern.multiplier}x)`;
            btn.dataset.pattern = pattern.id;
            btn.onclick = () => this.selectPattern(pattern.id, btn);
            container.appendChild(btn);
        });
    }
    
    static selectPattern(pattern, button) {
        const game = GameManager.getInstance();
        
        if (game.isPlaying) {
            this.showNotification('Cannot change pattern while playing!', 'error');
            return;
        }
        
        // Clear active class
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set new pattern
        if (game.setPattern(pattern)) {
            button.classList.add('active');
            
            // Update label
            document.getElementById('pattern-label').textContent = pattern.toUpperCase().replace('-', ' ');
            
            // Update confirmation if number is selected
            if (game.selectedNumber) {
                document.getElementById('confirmPattern').textContent = pattern.toUpperCase();
            }
            
            this.showNotification(`Pattern set to ${pattern}`, 'success');
        }
    }
    
    static createBingoCard() {
        const grid = document.getElementById('cardGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Create 5x5 grid
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (row === 2 && col === 2) { // Center
                    cell.textContent = 'FREE';
                    cell.style.background = 'var(--accent)';
                    cell.style.color = 'white';
                    cell.classList.add('marked');
                    cell.dataset.number = '0';
                } else {
                    cell.textContent = '-';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                }
                
                grid.appendChild(cell);
            }
        }
    }
    
    static updateCard(numbers) {
        const grid = document.getElementById('cardGrid');
        if (!grid || !numbers || numbers.length !== 25) return;
        
        const cells = grid.querySelectorAll('.cell:not([data-number="0"])');
        
        numbers.forEach((number, index) => {
            if (index < cells.length && number !== 0) {
                const cell = cells[index];
                cell.textContent = number;
                cell.dataset.number = number;
                
                // Color by letter
                const letter = this.getLetterForNumber(number);
                cell.style.borderTop = `3px solid ${GameManager.getLetterColor(letter)}`;
            }
        });
    }
    
    static markCardCell(number) {
        const cells = document.querySelectorAll('.cell[data-number]');
        cells.forEach(cell => {
            if (parseInt(cell.dataset.number) === number) {
                cell.classList.add('marked');
            }
        });
    }
    
    static updateCallDisplay(letter, number, fullCall) {
        // Update letter display with color
        const letterEl = document.getElementById('callLetter');
        if (letterEl) {
            letterEl.textContent = letter;
            letterEl.style.background = GameManager.getLetterColor(letter);
            letterEl.classList.add('pulse');
            setTimeout(() => letterEl.classList.remove('pulse'), 500);
        }
        
        // Update number display
        const numberEl = document.getElementById('callNumber');
        if (numberEl) {
            numberEl.textContent = number;
            numberEl.classList.add('pulse');
            setTimeout(() => numberEl.classList.remove('pulse'), 500);
        }
        
        // Update full call display
        const fullEl = document.getElementById('callFull');
        if (fullEl) {
            fullEl.textContent = fullCall;
        }
        
        // Add to call history
        this.addToCallHistory(fullCall, letter);
    }
    
    static addToCallHistory(call, letter) {
        const container = document.getElementById('callHistory');
        if (!container) return;
        
        const item = document.createElement('div');
        item.className = 'call-item';
        item.innerHTML = `
            <span style="color: ${GameManager.getLetterColor(letter)}; font-weight: bold">${call}</span>
        `;
        
        container.insertBefore(item, container.firstChild);
        
        // Keep only last 8 calls
        if (container.children.length > 8) {
            container.removeChild(container.lastChild);
        }
    }
    
    static updateProgress() {
        const game = GameManager.getInstance();
        const progress = (game.drawsCompleted / game.maxDraws) * 100;
        
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${game.drawsCompleted} / ${game.maxDraws}`;
    }
    
    static updateStats() {
        const game = GameManager.getInstance();
        
        // Update main stats
        document.getElementById('activePlayers').textContent = game.activePlayers;
        document.getElementById('totalCards').textContent = game.takenNumbers.size;
        document.getElementById('winnersCount').textContent = game.winners.length;
        
        // Update mini stats
        document.getElementById('sessionNumber').textContent = game.currentSession;
        document.getElementById('drawsCount').textContent = game.drawsCompleted;
        document.getElementById('winsMini').textContent = game.winners.length;
        
        // Update balance
        document.getElementById('balance').textContent = game.balance.toLocaleString();
        document.getElementById('modalBalance').textContent = game.balance;
    }
    
    static updateUI() {
        const game = GameManager.getInstance();
        
        // Update wager displays
        document.getElementById('wagerBtnLabel').textContent = game.wager;
        document.getElementById('modalWager').textContent = game.wager;
        
        // Update card status
        if (game.isPlaying) {
            document.getElementById('cardStatus').textContent = 'Playing';
            document.getElementById('cardStatus').style.color = 'var(--secondary)';
        } else if (game.selectedNumber) {
            document.getElementById('cardStatus').textContent = 'Ready to Join';
            document.getElementById('cardStatus').style.color = 'var(--accent)';
        } else {
            document.getElementById('cardStatus').textContent = 'Not Joined';
            document.getElementById('cardStatus').style.color = 'var(--text-dim)';
        }
        
        // Update taken numbers
        this.updateTakenNumbers();
    }
    
    static updateTakenNumbers() {
        const game = GameManager.getInstance();
        
        document.querySelectorAll('.num-btn').forEach(btn => {
            const num = parseInt(btn.textContent);
            if (game.takenNumbers.has(num)) {
                btn.classList.add('taken');
                btn.disabled = true;
            } else {
                btn.classList.remove('taken');
                btn.disabled = false;
            }
        });
    }
    
    static updatePhaseUI() {
        const game = GameManager.getInstance();
        
        // Update phase-specific UI
        if (game.currentPhase === 'drawing') {
            // Disable pattern buttons during drawing
            document.querySelectorAll('.pattern-btn').forEach(btn => {
                btn.disabled = true;
            });
            
            // Update status text
            document.getElementById('status-text').textContent = 'DRAWING IN PROGRESS';
            document.getElementById('status-text').style.color = 'var(--danger)';
            
        } else { // picking phase
            // Enable pattern buttons
            document.querySelectorAll('.pattern-btn').forEach(btn => {
                btn.disabled = false;
            });
            
            // Update status text
            document.getElementById('status-text').textContent = 'JOIN PHASE ACTIVE';
            document.getElementById('status-text').style.color = 'var(--secondary)';
        }
    }
    
    // Modal Management
    static showJoinConfirmation() {
        const game = GameManager.getInstance();
        
        if (!game.selectedNumber) {
            this.showNotification('Please select a number first!', 'error');
            return;
        }
        
        document.getElementById('joinConfirm').style.display = 'block';
    }
    
    static confirmJoin() {
        const game = GameManager.getInstance();
        
        if (game.joinSession()) {
            // Success - button will be disabled by game logic
            document.getElementById('joinConfirm').style.display = 'none';
        }
    }
    
    static cancelJoin() {
        const game = GameManager.getInstance();
        game.selectedNumber = null;
        document.getElementById('joinConfirm').style.display = 'none';
        document.getElementById('cardStatus').textContent = 'Not Joined';
        
        // Clear selection
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        this.showNotification('Join cancelled', 'info');
    }
    
    // Wager Management
    static toggleWagerModal() {
        const modal = document.getElementById('wagerModal');
        modal.classList.toggle('active');
    }
    
    static closeWagerModal() {
        document.getElementById('wagerModal').classList.remove('active');
    }
    
    static changeWager(amount) {
        const game = GameManager.getInstance();
        const newWager = game.wager + amount;
        
        if (game.setWager(newWager)) {
            this.updateUI();
            this.showNotification(`Wager set to ${newWager}`, 'success');
        } else {
            this.showNotification('Invalid wager amount!', 'error');
        }
    }
    
    // Phase Management
    static prepareForNextSession() {
        const game = GameManager.getInstance();
        
        if (game.currentPhase === 'drawing') {
            this.showNotification('Prepare your number for the next join phase!', 'info');
            
            // Scroll to number selection
            document.querySelector('.selector-box').scrollIntoView({ behavior: 'smooth' });
        } else {
            this.showNotification('Join phase is active! Pick your number now.', 'success');
        }
    }
    
    // Modal Display Functions
    static showWinModal(winnings) {
        const game = GameManager.getInstance();
        
        document.getElementById('winAmount').textContent = `+${winnings}`;
        document.getElementById('winPattern').textContent = game.pattern.toUpperCase();
        document.getElementById('winCalls').textContent = game.drawsCompleted;
        document.getElementById('winWager').textContent = game.wager;
        document.getElementById('winModal').classList.add('active');
    }
    
    static closeWinModal() {
        document.getElementById('winModal').classList.remove('active');
    }
    
    static showLoseModal() {
        const game = GameManager.getInstance();
        
        document.getElementById('loseAmount').textContent = `-${game.wager}`;
        document.getElementById('loseModal').classList.add('active');
    }
    
    static closeLoseModal() {
        document.getElementById('loseModal').classList.remove('active');
    }
    
    static showJoinPhaseModal() {
        document.getElementById('joinPhaseModal').classList.add('active');
    }
    
    static closeJoinPhaseModal() {
        document.getElementById('joinPhaseModal').classList.remove('active');
    }
    
    static showGameHistory() {
        // Update history display
        HistoryManager.updateHistoryDisplay();
        
        // Show modal
        document.getElementById('historyModal').classList.add('active');
    }
    
    static closeHistoryModal() {
        document.getElementById('historyModal').classList.remove('active');
    }
    
    // Notification System
    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--secondary)' : 'var(--primary)'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    
    static setupEventListeners() {
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    }
}

// Make globally available
window.UIManager = UIManager;
