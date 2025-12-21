// Game History Manager
class HistoryManager {
    static history = [];
    static winners = [];
    static maxHistoryItems = 50;
    static maxWinners = 20;
    
    static init() {
        this.loadFromStorage();
        this.setupAutoSave();
    }
    
    static loadFromStorage() {
        try {
            const savedHistory = localStorage.getItem('bingo_history');
            const savedWinners = localStorage.getItem('bingo_winners');
            
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            }
            
            if (savedWinners) {
                this.winners = JSON.parse(savedWinners);
            }
            
            console.log(`Loaded ${this.history.length} history items and ${this.winners.length} winners`);
        } catch (error) {
            console.error('Failed to load history from storage:', error);
            this.history = [];
            this.winners = [];
        }
    }
    
    static saveToStorage() {
        try {
            localStorage.setItem('bingo_history', JSON.stringify(this.history));
            localStorage.setItem('bingo_winners', JSON.stringify(this.winners));
        } catch (error) {
            console.error('Failed to save history to storage:', error);
        }
    }
    
    static setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveToStorage();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });
    }
    
    static addGameRecord(record) {
        const fullRecord = {
            ...record,
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: GameSession.sessionId,
            drawCount: GameSession.drawCount
        };
        
        this.history.unshift(fullRecord);
        
        // Keep history manageable
        if (this.history.length > this.maxHistoryItems) {
            this.history.pop();
        }
        
        this.saveToStorage();
        this.updateHistoryBadge();
        
        return fullRecord;
    }
    
    static addWinner(winnerData) {
        const winnerRecord = {
            ...winnerData,
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: GameSession.sessionId,
            drawCount: GameSession.drawCount
        };
        
        this.winners.unshift(winnerRecord);
        
        // Keep winners list manageable
        if (this.winners.length > this.maxWinners) {
            this.winners.pop();
        }
        
        this.saveToStorage();
        this.updateHistoryBadge();
        
        return winnerRecord;
    }
    
    static getRecentGames(count = 10) {
        return this.history.slice(0, count);
    }
    
    static getRecentWinners(count = 10) {
        return this.winners.slice(0, count);
    }
    
    static getWinStats(timeframe = 24 * 60 * 60 * 1000) { // Default: 24 hours
        const now = Date.now();
        const timeframeStart = now - timeframe;
        
        const gamesInTimeframe = this.history.filter(game => 
            game.timestamp >= timeframeStart && 
            (game.type === 'win' || game.type === 'loss')
        );
        
        const wins = gamesInTimeframe.filter(game => game.type === 'win');
        const losses = gamesInTimeframe.filter(game => game.type === 'loss');
        
        const totalWagered = gamesInTimeframe.reduce((sum, game) => sum + (game.wager || 0), 0);
        const totalWon = wins.reduce((sum, win) => sum + (win.winnings || 0), 0);
        
        return {
            totalGames: gamesInTimeframe.length,
            wins: wins.length,
            losses: losses.length,
            winRate: gamesInTimeframe.length > 0 ? (wins.length / gamesInTimeframe.length) * 100 : 0,
            totalWagered: totalWagered,
            totalWon: totalWon,
            netProfit: totalWon - totalWagered
        };
    }
    
    static getPatternStats() {
        const patternStats = {};
        const wins = this.history.filter(game => game.type === 'win');
        
        wins.forEach(win => {
            const pattern = win.pattern || 'unknown';
            if (!patternStats[pattern]) {
                patternStats[pattern] = {
                    count: 0,
                    totalWinnings: 0,
                    avgDraws: 0,
                    drawCounts: []
                };
            }
            
            patternStats[pattern].count++;
            patternStats[pattern].totalWinnings += win.winnings || 0;
            patternStats[pattern].drawCounts.push(win.drawCount || 0);
        });
        
        // Calculate averages
        Object.keys(patternStats).forEach(pattern => {
            const stats = patternStats[pattern];
            const totalDraws = stats.drawCounts.reduce((sum, count) => sum + count, 0);
            stats.avgDraws = stats.count > 0 ? Math.round(totalDraws / stats.count) : 0;
            delete stats.drawCounts;
        });
        
        return patternStats;
    }
    
    static getHistoryCount() {
        return this.winners.length;
    }
    
    static loadHistory() {
        this.updateHistoryDisplay();
        this.updateStatisticsDisplay();
    }
    
    static updateHistoryDisplay() {
        const winnersList = document.getElementById('winnersList');
        if (!winnersList) return;
        
        const recentWinners = this.getRecentWinners(5);
        
        if (recentWinners.length === 0) {
            winnersList.innerHTML = `
                <div class="no-history">
                    <p>No winners yet. Be the first!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        recentWinners.forEach((winner, index) => {
            const timeAgo = this.getTimeAgo(winner.timestamp);
            const isCurrentPlayer = winner.id && winner.id.includes('player_') ? false : true;
            
            html += `
                <div class="winner-item">
                    <div class="winner-header">
                        <span class="winner-rank">#${index + 1}</span>
                        <span class="winner-time">${timeAgo}</span>
                    </div>
                    <div class="winner-details">
                        <span class="winner-pattern">${winner.pattern || 'Unknown'}</span>
                        <span class="winner-winnings">+${winner.winnings || 0} credits</span>
                    </div>
                    <div class="winner-card">
                        ${this.generateCardHTML(winner.cardNumbers || [])}
                    </div>
                </div>
            `;
        });
        
        winnersList.innerHTML = html;
    }
    
    static generateCardHTML(numbers) {
        if (!numbers || numbers.length !== 25) {
            return '<div class="no-card">No card data</div>';
        }
        
        let html = '';
        for (let i = 0; i < 25; i++) {
            const isWinner = numbers[i] === 12 ? true : GameSession.drawnNumbers.includes(numbers[i]);
            html += `
                <div class="winner-card-cell ${isWinner ? 'winner' : ''}">
                    ${numbers[i] === 12 ? 'FREE' : numbers[i]}
                </div>
            `;
        }
        return html;
    }
    
    static updateStatisticsDisplay() {
        const stats = this.getWinStats();
        const patternStats = this.getPatternStats();
        
        // Update general stats
        document.getElementById('totalGames').textContent = stats.totalGames;
        document.getElementById('totalWins').textContent = stats.wins;
        document.getElementById('winRate').textContent = `${stats.winRate.toFixed(1)}%`;
        document.getElementById('totalWagered').textContent = stats.totalWagered.toLocaleString();
    }
    
    static displayWinners() {
        this.updateHistoryDisplay();
    }
    
    static getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }
    
    static generateId() {
        return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    static updateHistoryBadge() {
        const badge = document.getElementById('historyBadge');
        if (badge) {
            const count = this.getHistoryCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }
    
    static clearHistory() {
        if (confirm('Are you sure you want to clear all game history? This cannot be undone.')) {
            this.history = [];
            this.winners = [];
            this.saveToStorage();
            this.updateHistoryDisplay();
            this.updateHistoryBadge();
            
            UIManager.showNotification('History cleared', 'success');
        }
    }
    
    static exportHistory() {
        const data = {
            history: this.history,
            winners: this.winners,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bingo_history_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UIManager.showNotification('History exported', 'success');
    }
}

// Initialize History Manager
HistoryManager.init();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}