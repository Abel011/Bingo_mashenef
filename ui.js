// UI Manager
class UIManager {
    static init() {
        this.createNumberGrid();
        this.createPatternSelector();
        this.setupEventListeners();
        this.updateUI();
    }
    
    static createNumberGrid() {
        const grid = document.getElementById('numberGrid');
        grid.innerHTML = '';
        
        for (let i = 1; i <= 200; i++) {
            const btn = document.createElement('button');
            btn.className = 'num-btn';
            btn.textContent = i;
            btn.id = `num-${i}`;
            
            // Color code by BINGO column
            const letterInfo = BingoAnnouncer.getLetterForNumber(i);
            btn.style.borderColor = letterInfo.color + '40';
            
            btn.onclick = () => this.selectCenterNumber(i, btn);
            grid.appendChild(btn);
        }
        
        this.updateTakenNumbers();
    }
    
    static selectCenterNumber(number, button) {
        const state = GameState.getInstance();
        const session = GameSession;
        
        if (state.isPlaying) {
            this.showNotification('Already in game! Leave first.', 'error');
            return;
        }
        
        if (!session.sessionActive) {
            this.showNotification('Wait for next session', 'warning');
            return;
        }
        
        if (session.takenNumbers.has(number)) {
            this.showNotification('Number already taken', 'error');
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
        document.getElementById('selected-label').textContent = `Selected: ${number}`;
        
        // Generate card
        this.generateCard(number);
        
        // Enable join button
        document.getElementById('startBtn').disabled = false;
        
        this.showNotification(`Selected number ${number}`, 'success');
    }
    
    static generateCard(centerNumber) {
        const state = GameState.getInstance();
        const grid = document.getElementById('cardGrid');
        grid.innerHTML = '';
        
        const numbers = [];
        
        // Generate numbers around center
        for (let i = -12; i <= 12; i++) {
            let val = centerNumber + i;
            if (val < 1) val = 200 + val;
            if (val > 200) val = val - 200;
            numbers.push(val);
        }
        
        state.cardNumbers = numbers;
        
        // Create card
        numbers.forEach((n, index) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (index === 12) { // Center
                cell.textContent = 'FREE';
                cell.style.background = 'var(--accent)';
                cell.style.color = 'white';
                state.markedCells.add('free');
            } else {
                cell.textContent = n;
                cell.dataset.val = n;
                
                // Color by letter
                const letterInfo = BingoAnnouncer.getLetterForNumber(n);
                cell.style.borderTop = `3px solid ${letterInfo.color}`;
                
                // Mark if already drawn
                if (GameSession.drawnNumbers.includes(n)) {
                    state.markedCells.add(n.toString());
                    cell.classList.add('marked');
                }
            }
            
            grid.appendChild(cell);
        });
    }
    
    static createPatternSelector() {
        const container = document.getElementById('patternSelector');
        const patterns = [
            { id: 'line', name: 'LINE', multiplier: 5 },
            { id: 'four-corners', name: 'FOUR CORNERS', multiplier: 3 },
            { id: 'full-house', name: 'FULL HOUSE', multiplier: 10 },
            { id: 'x', name: 'X PATTERN', multiplier: 7 },
            { id: 'blackout', name: 'BLACKOUT', multiplier: 15 }
        ];
        
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
        const state = GameState.getInstance();
        
        if (state.isPlaying) {
            this.showNotification('Cannot change pattern while playing', 'error');
            return;
        }
        
        // Clear active class
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set new pattern
        state.currentPattern = pattern;
        button.classList.add('active');
        
        // Update label
        document.getElementById('pattern-label').textContent = pattern.toUpperCase().replace('-', ' ');
        
        this.showNotification(`Pattern: ${pattern}`, 'success');
    }
    
    static updateUI() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        // Update balance
        document.getElementById('balance').textContent = state.balance.toLocaleString();
        document.getElementById('modalWager').textContent = state.wager;
        document.getElementById('wagerBtnLabel').textContent = state.wager;
        document.getElementById('modalBalance').textContent = state.balance;
        
        // Update session info
        document.getElementById('sessionCount').textContent = session.sessionId;
        
        const status = session.sessionActive ? 'ACTIVE' : 
                     session.waitingForNextSession ? 'WAITING' : 'ENDED';
        document.getElementById('sessionStatus').textContent = status;
        
        // Update game status indicator
        const indicator = document.getElementById('gameStatusIndicator');
        indicator.textContent = status;
        indicator.className = `game-status status-${status.toLowerCase()}`;
        
        // Update progress
        document.getElementById('drawCount').textContent = session.drawCount;
        const progressPercent = (session.drawCount / session.maxDraws) * 100;
        document.getElementById('progressBar').style.width = `${progressPercent}%`;
        
        // Update multiplayer stats
        document.getElementById('activePlayers').textContent = session.activePlayers;
        document.getElementById('totalCards').textContent = session.totalCards;
        document.getElementById('winnersCount').textContent = session.winnersCount;
        
        // Update taken numbers
        this.updateTakenNumbers();
        
        // Update start button
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = state.isPlaying || !state.selectedCenter || !session.sessionActive;
            startBtn.textContent = state.isPlaying ? 'PLAYING...' : 'JOIN GAME';
        }
        
        // Update hot numbers
        this.updateHotNumbers();
    }
    
    static updateTakenNumbers() {
        const session = GameSession;
        
        document.querySelectorAll('.num-btn').forEach(btn => {
            const num = parseInt(btn.textContent);
            if (session.takenNumbers.has(num)) {
                btn.classList.add('taken');
                btn.disabled = true;
                btn.classList.remove('recommended');
            } else {
                btn.classList.remove('taken');
                btn.disabled = false;
                
                // Mark recommended numbers (hot numbers)
                const isRecommended = Math.random() < 0.1; // Simplified
                if (isRecommended) {
                    btn.classList.add('recommended');
                } else {
                    btn.classList.remove('recommended');
                }
            }
        });
    }
    
    static updateHotNumbers() {
        const container = document.getElementById('hotNumbers');
        if (!container) return;
        
        // Generate some hot numbers (simplified)
        const hotNumbers = [];
        for (let i = 0; i < 8; i++) {
            const num = Math.floor(Math.random() * 200) + 1;
            const count = Math.floor(Math.random() * 5) + 1;
            hotNumbers.push({ number: num, count: count });
        }
        
        container.innerHTML = '';
        hotNumbers.forEach(hot => {
            const div = document.createElement('div');
            div.className = 'hot-number';
            div.textContent = hot.number;
            div.dataset.count = hot.count;
            container.appendChild(div);
        });
    }
    
    static updateCallHistory() {
        const list = document.getElementById('callsList');
        if (!list) return;
        
        list.innerHTML = '';
        GameSession.callHistory.slice(0, 8).forEach(call => {
            const item = document.createElement('div');
            item.className = 'call-item';
            item.innerHTML = `
                <span style="color: ${call.color}">${call.letter}</span>
                <span>-</span>
                <span>${call.number}</span>
            `;
            list.appendChild(item);
        });
        
        document.getElementById('callCount').textContent = `${GameSession.callHistory.length} calls`;
    }
    
    static joinSession() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        // Validate
        if (!state.selectedCenter) {
            this.showNotification('Select a number or use Quick Join', 'error');
            return;
        }
        
        if (!session.sessionActive) {
            this.showNotification('Session not active', 'error');
            return;
        }
        
        if (session.takenNumbers.has(state.selectedCenter)) {
            this.showNotification('Number already taken', 'error');
            this.updateTakenNumbers();
            return;
        }
        
        if (state.balance < state.wager) {
            this.showNotification('Insufficient balance', 'error');
            return;
        }
        
        // Deduct wager
        state.balance -= state.wager;
        
        // Take number
        if (!session.takeNumber(state.selectedCenter)) {
            state.balance += state.wager; // Refund
            this.showNotification('Failed to join', 'error');
            return;
        }
        
        // Set player state
        state.isPlaying = true;
        state.hasJoinedSession = true;
        state.sessionWon = false;
        
        // Mark free space
        const centerCell = document.querySelector('.cell[style*="background: var(--accent)"]');
        if (centerCell) centerCell.classList.add('marked');
        
        // Mark already drawn numbers
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            if (cell.dataset.val && session.drawnNumbers.includes(parseInt(cell.dataset.val))) {
                state.markedCells.add(cell.dataset.val);
                cell.classList.add('marked');
            }
        });
        
        this.updateUI();
        this.showNotification(`Joined with number ${state.selectedCenter}`, 'success');
    }
    
    static checkWin() {
        const state = GameState.getInstance();
        if (!state.isPlaying) return;
        
        const pattern = state.currentPattern;
        const hasWon = BingoPatterns.checkPattern(pattern);
        
        if (hasWon) {
            this.processWin();
        }
    }
    
    static processWin() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        state.sessionWon = true;
        state.isPlaying = false;
        state.hasJoinedSession = false;
        
        // Calculate winnings
        const multipliers = {
            'line': 5,
            'four-corners': 3,
            'full-house': 10,
            'x': 7,
            'blackout': 15
        };
        
        const multiplier = multipliers[state.currentPattern] || 5;
        const winnings = state.wager * multiplier;
        
        // Add winnings
        state.balance += winnings;
        
        // Release number
        session.releaseNumber(state.selectedCenter);
        
        // Show win modal
        document.getElementById('winAmount').textContent = `+${winnings}`;
        document.getElementById('winPattern').textContent = state.currentPattern.toUpperCase();
        document.getElementById('winDraws').textContent = session.drawCount;
        document.getElementById('winWager').textContent = state.wager;
        document.getElementById('winModal').classList.add('active');
        
        this.updateUI();
        this.showNotification(`BINGO! You won ${winnings} credits!`, 'success');
    }
    
    static findAvailableNumber() {
        const session = GameSession;
        
        // Find first available number
        for (let i = 1; i <= 200; i++) {
            if (!session.takenNumbers.has(i)) {
                const btn = document.getElementById(`num-${i}`);
                if (btn) {
                    this.selectCenterNumber(i, btn);
                    
                    // Scroll to the number
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btn.classList.add('pulse');
                    setTimeout(() => btn.classList.remove('pulse'), 1000);
                    
                    this.showNotification(`Found available number: ${i}`, 'success');
                    return;
                }
            }
        }
        
        this.showNotification('No numbers available', 'error');
    }
    
    static resetPlayerGame() {
        const state = GameState.getInstance();
        const session = GameSession;
        
        if (state.isPlaying && !confirm('Leave game? Your wager will be lost.')) {
            return;
        }
        
        if (state.isPlaying) {
            session.releaseNumber(state.selectedCenter);
        }
        
        state.isPlaying = false;
        state.hasJoinedSession = false;
        state.selectedCenter = null;
        state.markedCells.clear();
        
        // Clear selection
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Clear marked cells
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('marked');
        });
        
        this.updateUI();
        this.showNotification('Left the game', 'info');
    }
    
    static showNotification(message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to document
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
        // Wager modal
        const wagerModal = document.getElementById('wagerModal');
        wagerModal.addEventListener('click', (e) => {
            if (e.target === wagerModal) {
                this.toggleWagerModal();
            }
        });
        
        // Quick join modal
        const quickJoinModal = document.getElementById('quickJoinModal');
        if (quickJoinModal) {
            quickJoinModal.addEventListener('click', (e) => {
                if (e.target === quickJoinModal) {
                    this.closeQuickJoinModal();
                }
            });
        }
        
        // History modal
        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
            historyModal.addEventListener('click', (e) => {
                if (e.target === historyModal) {
                    this.closeHistoryModal();
                }
            });
        }
    }
}

// Global functions for HTML onclick
function toggleWagerModal() {
    const modal = document.getElementById('wagerModal');
    modal.classList.toggle('active');
}

function changeWager(amount) {
    const state = GameState.getInstance();
    const newWager = state.wager + amount;
    
    if (newWager < 10 || newWager > 500) {
        UIManager.showNotification('Wager must be 10-500', 'error');
        return;
    }
    
    if (newWager > state.balance) {
        UIManager.showNotification('Cannot exceed balance', 'error');
        return;
    }
    
    state.wager = newWager;
    UIManager.updateUI();
    UIManager.showNotification(`Wager set to ${newWager}`, 'success');
}

function closeWinModal() {
    document.getElementById('winModal').classList.remove('active');
    const state = GameState.getInstance();
    state.selectedCenter = null;
    UIManager.updateUI();
}

function closeLoseModal() {
    document.getElementById('loseModal').classList.remove('active');
    const state = GameState.getInstance();
    state.selectedCenter = null;
    UIManager.updateUI();
}

function toggleGameHistory() {
    document.getElementById('historyModal').classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

function switchTab(tabName) {
    // Hide all tabs
    ['winnersTab', 'statsTab', 'numbersTab'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    
    // Remove active class
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).style.display = 'block';
    
    // Activate tab button
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.textContent.includes(tabName.charAt(0).toUpperCase())) {
            tab.classList.add('active');
        }
    });
}

window.UIManager = UIManager;
