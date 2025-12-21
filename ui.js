// UI Manager
class UIManager {
    static init() {
        // Create number grid
        this.createNumberGrid();
        
        // Create pattern selector
        this.createPatternSelector();
        
        // Initialize UI
        this.updateUI();
        this.updateStats();
        
        // Set up initial state
        this.updatePhaseUI();
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
            const letter = GameManager.getLetterForNumber(i);
            btn.style.borderLeftColor = this.getLetterColor(letter);
            btn.style.borderLeftWidth = '3px';
            
            btn.onclick = () => this.selectNumber(i, btn);
            grid.appendChild(btn);
        }
    }
    
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
    
    static selectNumber(number, button) {
        const state = GameManager.getInstance();
        
        // Clear previous selection
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select new number
        if (GameManager.selectNumber(number)) {
            button.classList.add('selected');
            
            // Show confirmation
            document.getElementById('joinConfirm').style.display = 'block';
            document.getElementById('cardStatus').textContent = 'Ready to Join';
            
            this.showNotification(`Selected number ${number}`, 'success');
        }
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
        const state = GameManager.getInstance();
        
        if (state.isPlaying) {
            this.showNotification('Cannot change pattern while playing!', 'error');
            return;
        }
        
        // Clear active class
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set new pattern
        GameManager.setPattern(pattern);
        button.classList.add('active');
        
        // Update label
        document.getElementById('pattern-label').textContent = pattern.toUpperCase().replace('-', ' ');
        
        // Update confirmation if number is selected
        if (state.selectedNumber) {
            document.getElementById('confirmPattern').textContent = pattern.toUpperCase();
        }
        
        this.showNotification(`Pattern set to ${pattern}`, 'success');
    }
    
    static updateCard(numbers) {
        const grid = document.getElementById('cardGrid');
        grid.innerHTML = '';
        
        numbers.forEach((number, index) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (index === 12) { // Center
                cell.textContent = 'FREE';
                cell.style.background = 'var(--accent)';
                cell.style.color = 'white';
                cell.classList.add('marked');
            } else {
                cell.textContent = number;
                cell.dataset.number = number;
                
                // Color by letter
                const letter = GameManager.getLetterForNumber(number);
                cell.style.borderTop = `3px solid ${this.getLetterColor(letter)}`;
            }
            
            grid.appendChild(cell);
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
        letterEl.textContent = letter;
        letterEl.className = `call-letter color-${letter.toLowerCase()}`;
        letterEl.style.background = this.getLetterColor(letter);
        
        // Update number display
        document.getElementById('callNumber').textContent = number;
        document.getElementById('callFull').textContent = fullCall;
        
        // Add to call history
        this.addToCallHistory(fullCall, letter);
    }
    
    static addToCallHistory(call, letter) {
        const container = document.getElementById('callHistory');
        const item = document.createElement('div');
        item.className = 'call-item';
        item.innerHTML = `
            <span style="color: ${this.getLetterColor(letter)}; font-weight: bold">${call}</span>
        `;
        
        container.insertBefore(item, container.firstChild);
        
        // Keep only last 8 calls
        if (container.children.length > 8) {
            container.removeChild(container.lastChild);
        }
        
        // Update history modal
        this.updateHistoryCalls();
    }
    
    static updateHistoryCalls() {
        const state = GameManager.getInstance();
        const container = document.getElementById('historyCalls');
        
        if (!container) return;
        
        container.innerHTML = '';
        state.callHistory.slice(0, 15).forEach(call => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <span style="color: ${this.getLetterColor(call.letter)}; font-weight: bold">
                    ${call.call}
                </span>
                <span style="color: var(--text-dim); font-size: 0.8rem">
                    ${this.formatTimeAgo(call.timestamp)}
                </span>
            `;
            container.appendChild(item);
        });
    }
    
    static formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
    
    static updateProgress() {
        const state = GameManager.getInstance();
        const progress = (state.drawsCompleted / state.maxDraws) * 100;
        
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${state.drawsCompleted} / ${state.maxDraws}`;
    }
    
    static updateStats() {
        const state = GameManager.getInstance();
        
        // Update main stats
        document.getElementById('activePlayers').textContent = state.activePlayers;
        document.getElementById('totalCards').textContent = state.takenNumbers.size;
        document.getElementById('winnersCount').textContent = state.winners.length;
        
        // Update mini stats
        document.getElementById('sessionNumber').textContent = state.currentSession;
        document.getElementById('drawsCount').textContent = state.drawsCompleted;
        document.getElementById('winsMini').textContent = state.winners.length;
        
        // Update balance
        document.getElementById('balance').textContent = state.balance.toLocaleString();
        document.getElementById('modalBalance').textContent = state.balance;
    }
    
    static updateUI() {
        const state = GameManager.getInstance();
        
        // Update wager displays
        document.getElementById('wagerBtnLabel').textContent = state.wager;
        document.getElementById('modalWager').textContent = state.wager;
        
        // Update card status
        if (state.isPlaying) {
            document.getElementById('cardStatus').textContent = 'Playing';
            document.getElementById('cardStatus').style.color = 'var(--secondary)';
        } else if (state.selectedNumber) {
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
        const state = GameManager.getInstance();
        
        document.querySelectorAll('.num-btn').forEach(btn => {
            const num = parseInt(btn.textContent);
            if (state.takenNumbers.has(num)) {
                btn.classList.add('taken');
                btn.disabled = true;
            } else {
                btn.classList.remove('taken');
                btn.disabled = false;
            }
        });
    }
    
    static updatePhaseUI() {
        const state = GameManager.getInstance();
        
        // Update phase-specific UI
        if (state.currentPhase === 'drawing') {
            // Disable pattern buttons
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
    
    static showWinModal(winnings) {
        const state = GameManager.getInstance();
        
        document.getElementById('winAmount').textContent = `+${winnings}`;
        document.getElementById('winPattern').textContent = state.pattern.toUpperCase();
        document.getElementById('winCalls').textContent = state.drawsCompleted;
        document.getElementById('winWager').textContent = state.wager;
        document.getElementById('winModal').classList.add('active');
    }
    
    static showLoseModal() {
        const state = GameManager.getInstance();
        
        document.getElementById('loseAmount').textContent = `-${state.wager}`;
        document.getElementById('loseModal').classList.add('active');
    }
    
    static showJoinPhaseModal() {
        document.getElementById('joinPhaseModal').classList.add('active');
    }
    
    static closeJoinPhaseModal() {
        document.getElementById('joinPhaseModal').classList.remove('active');
    }
    
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
}

// Global functions for HTML onclick
function toggleWagerModal() {
    const modal = document.getElementById('wagerModal');
    modal.classList.toggle('active');
}

function changeWager(amount) {
    const state = GameManager.getInstance();
    const newWager = state.wager + amount;
    
    if (GameManager.setWager(newWager)) {
        UIManager.updateUI();
        UIManager.showNotification(`Wager set to ${newWager}`, 'success');
    } else {
        UIManager.showNotification('Invalid wager amount!', 'error');
    }
}

function prepareForNextSession() {
    const state = GameManager.getInstance();
    
    if (state.currentPhase === 'drawing') {
        UIManager.showNotification('Prepare your number for the next join phase!', 'info');
        
        // Scroll to number selection
        document.querySelector('.selector-box').scrollIntoView({ behavior: 'smooth' });
    } else {
        UIManager.showNotification('Join phase is active! Pick your number now.', 'success');
    }
}

function joinNextSession() {
    if (GameManager.joinNextSession()) {
        // Success - button will be disabled by game logic
    }
}

function confirmJoin() {
    joinNextSession();
}

function cancelJoin() {
    const state = GameManager.getInstance();
    state.selectedNumber = null;
    document.getElementById('joinConfirm').style.display = 'none';
    document.getElementById('cardStatus').textContent = 'Not Joined';
    
    // Clear selection
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    UIManager.showNotification('Join cancelled', 'info');
}

function closeWinModal() {
    document.getElementById('winModal').classList.remove('active');
}

function closeLoseModal() {
    document.getElementById('loseModal').classList.remove('active');
}

function showGameHistory() {
    // Update history data
    UIManager.updateHistoryCalls();
    
    // Show modal
    document.getElementById('historyModal').classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

// Make UIManager globally available
window.UIManager = UIManager;
