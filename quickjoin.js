// Quick Join Manager
class QuickJoinManager {
    static init() {
        this.setupRecommendedNumbers();
    }
    
    static async quickJoin() {
        try {
            const state = GameState.getInstance();
            const session = GameSession;
            
            // Validate
            if (state.isPlaying) {
                UIManager.showNotification('Already in game!', 'error');
                return;
            }
            
            if (!session.sessionActive) {
                UIManager.showNotification('Wait for next session', 'warning');
                return;
            }
            
            // Find best available number
            const bestNumber = this.findBestAvailableNumber();
            if (!bestNumber) {
                UIManager.showNotification('No numbers available', 'error');
                return;
            }
            
            // Get best pattern
            const bestPattern = this.getBestPattern();
            
            // Calculate optimal wager
            const optimalWager = this.calculateOptimalWager(state.balance);
            
            // Show confirmation modal
            const confirmed = await this.showQuickJoinModal({
                number: bestNumber,
                pattern: bestPattern,
                wager: optimalWager
            });
            
            if (!confirmed) return;
            
            // Apply selections
            state.selectedCenter = bestNumber;
            state.currentPattern = bestPattern;
            state.wager = optimalWager;
            
            // Generate card
            UIManager.generateCard(bestNumber);
            
            // Join session
            UIManager.joinSession();
            
        } catch (error) {
            ErrorHandler.showError(`Quick join failed: ${error.message}`);
        }
    }
    
    static findBestAvailableNumber() {
        const session = GameSession;
        
        // Strategy 1: Look for hot numbers first
        const hotNumbers = this.getHotNumbers();
        for (const num of hotNumbers) {
            if (!session.takenNumbers.has(num)) {
                return num;
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
                if (!session.takenNumbers.has(i)) {
                    return i;
                }
            }
        }
        
        // Strategy 3: Random available number
        for (let i = 1; i <= 200; i++) {
            if (!session.takenNumbers.has(i)) {
                return i;
            }
        }
        
        return null;
    }
    
    static getHotNumbers() {
        // Simplified hot numbers logic
        const hotNumbers = [];
        for (let i = 0; i < 20; i++) {
            hotNumbers.push(Math.floor(Math.random() * 200) + 1);
        }
        return hotNumbers;
    }
    
    static getColumnDensity() {
        const session = GameSession;
        const density = { B: 0, I: 0, N: 0, G: 0, O: 0 };
        
        session.takenNumbers.forEach(number => {
            const letter = BingoAnnouncer.getLetterForNumber(number).letter;
            density[letter]++;
        });
        
        return density;
    }
    
    static getBestPattern() {
        // Based on win rate statistics
        const patterns = ['line', 'four-corners', 'x', 'full-house', 'blackout'];
        const winRates = {
            'line': 0.3,
            'four-corners': 0.2,
            'x': 0.15,
            'full-house': 0.1,
            'blackout': 0.05
        };
        
        // Choose pattern with best balance of win rate and multiplier
        let bestPattern = 'line';
        let bestScore = 0;
        
        patterns.forEach(pattern => {
            const multiplier = this.getPatternMultiplier(pattern);
            const winRate = winRates[pattern] || 0.1;
            const score = multiplier * winRate;
            
            if (score > bestScore) {
                bestScore = score;
                bestPattern = pattern;
            }
        });
        
        return bestPattern;
    }
    
    static getPatternMultiplier(pattern) {
        const multipliers = {
            'line': 5,
            'four-corners': 3,
            'full-house': 10,
            'x': 7,
            'blackout': 15
        };
        return multipliers[pattern] || 5;
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
    
    static async showQuickJoinModal(options) {
        return new Promise((resolve) => {
            // Update modal content
            document.getElementById('quickJoinNumber').textContent = options.number;
            document.getElementById('quickJoinPattern').textContent = options.pattern.toUpperCase();
            document.getElementById('quickJoinWager').textContent = options.wager;
            
            // Calculate win chance
            const winChance = this.calculateWinChance(options);
            document.getElementById('quickJoinChance').textContent = winChance.text;
            document.getElementById('quickJoinChance').style.color = winChance.color;
            
            // Show modal
            const modal = document.getElementById('quickJoinModal');
            modal.classList.add('active');
            
            // Store resolve function
            modal._resolve = resolve;
        });
    }
    
    static confirmQuickJoin() {
        const modal = document.getElementById('quickJoinModal');
        if (modal._resolve) {
            modal._resolve(true);
            modal._resolve = null;
        }
        modal.classList.remove('active');
    }
    
    static closeQuickJoinModal() {
        const modal = document.getElementById('quickJoinModal');
        if (modal._resolve) {
            modal._resolve(false);
            modal._resolve = null;
        }
        modal.classList.remove('active');
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
        // Similar to quick join but with different strategy
        this.quickJoin();
    }
    
    static setupRecommendedNumbers() {
        // Mark some numbers as recommended
        setTimeout(() => {
            const recommendedNumbers = this.getHotNumbers().slice(0, 5);
            recommendedNumbers.forEach(num => {
                const btn = document.getElementById(`num-${num}`);
                if (btn && !btn.classList.contains('taken')) {
                    btn.classList.add('recommended');
                    btn.title = 'Recommended number';
                }
            });
        }, 1000);
    }
}

// Make globally available
window.QuickJoinManager = QuickJoinManager;
window.closeQuickJoinModal = QuickJoinManager.closeQuickJoinModal;
