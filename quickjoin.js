// Quick Join Manager
class QuickJoinManager {
    static init() {
        console.log('Quick Join Manager initializing...');
        this.setupRecommendedNumbers();
        return true;
    }
    
    static setupRecommendedNumbers() {
        // Mark some numbers as recommended after a delay
        setTimeout(() => {
            const hotNumbers = StatsManager.drawStats.hotNumbers || [];
            const recommendedNumbers = hotNumbers.slice(0, 5).map(num => num.number);
            
            recommendedNumbers.forEach(num => {
                const btn = document.getElementById(`num-${num}`);
                if (btn && !btn.classList.contains('taken')) {
                    btn.classList.add('recommended');
                    btn.title = 'Recommended number (hot)';
                    
                    // Add visual indicator
                    btn.style.position = 'relative';
                    btn.style.boxShadow = '0 0 8px var(--accent)';
                    
                    const fireIcon = document.createElement('span');
                    fireIcon.textContent = '🔥';
                    fireIcon.style.position = 'absolute';
                    fireIcon.style.top = '2px';
                    fireIcon.style.right = '2px';
                    fireIcon.style.fontSize = '0.6rem';
                    btn.appendChild(fireIcon);
                }
            });
        }, 2000);
    }
    
    static quickJoin() {
        try {
            const game = GameManager.getInstance();
            
            // Validate
            if (game.isPlaying) {
                UIManager.showNotification('Already in game!', 'error');
                return false;
            }
            
            if (game.currentPhase !== 'picking') {
                UIManager.showNotification('Wait for join phase', 'warning');
                return false;
            }
            
            // Find best available number
            const bestNumber = this.findBestAvailableNumber();
            if (!bestNumber) {
                UIManager.showNotification('No numbers available', 'error');
                return false;
            }
            
            // Get best pattern
            const bestPattern = this.getBestPattern();
            
            // Calculate optimal wager
            const optimalWager = this.calculateOptimalWager(game.balance);
            
            // Show confirmation modal
            this.showQuickJoinModal({
                number: bestNumber,
                pattern: bestPattern,
                wager: optimalWager
            });
            
            return true;
        } catch (error) {
            console.error('Quick join error:', error);
            UIManager.showNotification('Quick join failed', 'error');
            return false;
        }
    }
    
    static findBestAvailableNumber() {
        const game = GameManager.getInstance();
        
        // Strategy 1: Look for hot numbers first
        const hotNumbers = StatsManager.drawStats.hotNumbers || [];
        for (const hotNum of hotNumbers) {
            if (!game.takenNumbers.has(hotNum.number)) {
                return hotNum.number;
            }
        }
        
        // Strategy 2: Look for numbers in less crowded columns
        const columnDensity = this.getColumnDensity();
        const sortedColumns = Object.entries(columnDensity)
            .sort((a, b) => a[1] - b[1])
            .map(entry => entry[0]);
        
        for (const column of sortedColumns) {
            const range = BingoAnnouncer.getColumnRange(column);
            for (let i = range.min; i <= range.max; i++) {
                if (!game.takenNumbers.has(i)) {
                    return i;
                }
            }
        }
        
        // Strategy 3: Random available number
        for (let i = 1; i <= 200; i++) {
            if (!game.takenNumbers.has(i)) {
                return i;
            }
        }
        
        return null;
    }
    
    static getColumnDensity() {
        const game = GameManager.getInstance();
        const density = { B: 0, I: 0, N: 0, G: 0, O: 0 };
        
        game.takenNumbers.forEach(number => {
            const letterInfo = BingoAnnouncer.getLetterForNumber(number);
            if (letterInfo && letterInfo.letter) {
                density[letterInfo.letter]++;
            }
        });
        
        return density;
    }
    
    static getBestPattern() {
        // Based on win rate statistics and ease
        const patterns = ['line', 'four-corners', 'x', 'full-house', 'blackout'];
        
        // Line is usually the best for beginners
        return 'line';
    }
    
    static calculateOptimalWager(balance) {
        // Calculate 10-20% of balance, within limits
        const percentage = 0.15; // 15%
        let optimal = Math.floor(balance * percentage);
        
        // Ensure within bounds
        optimal = Math.max(10, Math.min(500, optimal));
        
        // Round to nearest 10
        optimal = Math.round(optimal / 10) * 10;
        
        return optimal;
    }
    
    static showQuickJoinModal(options) {
        // Update modal content
        const numberEl = document.getElementById('quickJoinNumber');
        const patternEl = document.getElementById('quickJoinPattern');
        const wagerEl = document.getElementById('quickJoinWager');
        const chanceEl = document.getElementById('quickJoinChance');
        
        if (numberEl) numberEl.textContent = options.number;
        if (patternEl) patternEl.textContent = options.pattern.toUpperCase();
        if (wagerEl) wagerEl.textContent = options.wager;
        
        // Calculate win chance
        const winChance = this.calculateWinChance(options);
        if (chanceEl) {
            chanceEl.textContent = winChance.text;
            chanceEl.style.color = winChance.color;
        }
        
        // Show modal
        const modal = document.getElementById('quickJoinModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    static confirmQuickJoin() {
        const modal = document.getElementById('quickJoinModal');
        if (!modal) return;
        
        // Get the selected options from modal
        const number = parseInt(document.getElementById('quickJoinNumber').textContent);
        const pattern = document.getElementById('quickJoinPattern').textContent.toLowerCase();
        const wager = parseInt(document.getElementById('quickJoinWager').textContent);
        
        const game = GameManager.getInstance();
        
        // Apply selections
        if (game.selectNumber(number)) {
            game.setPattern(pattern);
            game.setWager(wager);
            
            // Generate card
            game.generateCard(number);
            
            // Join session
            if (game.joinSession()) {
                UIManager.showNotification('Quick join successful!', 'success');
            }
        }
        
        // Close modal
        modal.classList.remove('active');
    }
    
    static closeQuickJoinModal() {
        const modal = document.getElementById('quickJoinModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    static calculateWinChance(options) {
        const letterInfo = BingoAnnouncer.getLetterForNumber(options.number);
        const column = letterInfo.letter;
        
        // Simple win chance calculation
        const baseChances = {
            'line': { low: 15, high: 25 },
            'four-corners': { low: 10, high: 20 },
            'x': { low: 8, high: 15 },
            'full-house': { low: 5, high: 10 },
            'blackout': { low: 2, high: 5 }
        };
        
        const base = baseChances[options.pattern] || baseChances.line;
        let chance = base.low + Math.random() * (base.high - base.low);
        
        // Adjust based on column density
        const density = this.getColumnDensity();
        const columnDensity = density[column] || 0;
        if (columnDensity < 10) chance += 5;
        if (columnDensity > 20) chance -= 5;
        
        // Clamp
        chance = Math.max(5, Math.min(50, Math.round(chance)));
        
        // Determine text and color
        let text, color;
        if (chance >= 30) {
            text = 'Excellent';
            color = '#10b981';
        } else if (chance >= 20) {
            text = 'Good';
            color = '#f59e0b';
        } else if (chance >= 10) {
            text = 'Fair';
            color = '#94a3b8';
        } else {
            text = 'Low';
            color = '#ef4444';
        }
        
        text += ` (${chance}%)`;
        
        return { text, color };
    }
    
    static joinWithRecommended() {
        // Quick join with recommended settings
        this.quickJoin();
    }
}

// Make globally available
window.QuickJoinManager = QuickJoinManager;
