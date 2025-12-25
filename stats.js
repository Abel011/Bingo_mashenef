// Statistics and Analytics Manager
class StatsManager {
    static init() {
        console.log('Stats Manager initializing...');
        
        // Initialize stats if not exists
        if (!this.drawStats) {
            this.drawStats = {
                totalDraws: 0,
                numberFrequency: {},
                timeBasedFrequency: {},
                recentDraws: [],
                sessionStats: [],
                hotNumbers: []
            };
        }
        
        if (!this.playerStats) {
            this.playerStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                totalWagered: 0,
                totalWon: 0,
                favoritePattern: null,
                bestWin: 0
            };
        }
        
        this.timeWindows = {
            '1h': 60 * 60 * 1000,
            '3h': 3 * 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };
        
        this.loadStats();
        this.setupAutoUpdate();
        this.initializeHotNumbers();
        
        return true;
    }
    
    static loadStats() {
        try {
            const savedStats = localStorage.getItem('bingo_stats');
            if (savedStats) {
                const parsed = JSON.parse(savedStats);
                this.drawStats = { ...this.drawStats, ...parsed.drawStats };
                this.playerStats = { ...this.playerStats, ...parsed.playerStats };
                console.log('Stats loaded from storage');
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    static saveStats() {
        try {
            const data = {
                drawStats: this.drawStats,
                playerStats: this.playerStats,
                savedAt: Date.now()
            };
            localStorage.setItem('bingo_stats', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save stats:', error);
        }
    }
    
    static setupAutoUpdate() {
        // Save stats every minute
        setInterval(() => {
            this.saveStats();
        }, 60000);
        
        // Update hot numbers every 5 minutes
        setInterval(() => {
            this.updateHotNumbers();
        }, 300000);
    }
    
    static recordDraw(number) {
        if (number < 1 || number > 200) {
            console.error('Invalid draw number:', number);
            return;
        }
        
        const now = Date.now();
        const game = GameManager.getInstance();
        
        const drawRecord = {
            number: number,
            timestamp: now,
            sessionId: game.sessionId,
            drawCount: game.drawsCompleted
        };
        
        // Update frequency
        this.drawStats.numberFrequency[number] = (this.drawStats.numberFrequency[number] || 0) + 1;
        this.drawStats.totalDraws++;
        
        // Add to recent draws
        this.drawStats.recentDraws.unshift(drawRecord);
        if (this.drawStats.recentDraws.length > 1000) {
            this.drawStats.recentDraws.pop();
        }
        
        // Update time-based frequency
        const hour = new Date(now).getHours();
        this.drawStats.timeBasedFrequency[hour] = (this.drawStats.timeBasedFrequency[hour] || 0) + 1;
        
        // Update hot numbers periodically
        if (this.drawStats.totalDraws % 10 === 0) {
            this.updateHotNumbers();
        }
    }
    
    static updateHotNumbers() {
        const timeWindow = this.timeWindows['3h']; // 3-hour window
        const cutoffTime = Date.now() - timeWindow;
        
        // Filter recent draws
        const recentDraws = this.drawStats.recentDraws.filter(
            draw => draw.timestamp >= cutoffTime
        );
        
        // Calculate frequency
        const frequency = {};
        recentDraws.forEach(draw => {
            frequency[draw.number] = (frequency[draw.number] || 0) + 1;
        });
        
        // Convert to array and sort
        const hotNumbers = Object.entries(frequency)
            .map(([number, count]) => ({
                number: parseInt(number),
                count: count,
                frequency: count / Math.max(1, recentDraws.length)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 hot numbers
        
        this.drawStats.hotNumbers = hotNumbers;
        
        return hotNumbers;
    }
    
    static initializeHotNumbers() {
        // Initialize with some random data for demonstration if empty
        if (this.drawStats.totalDraws === 0) {
            for (let i = 0; i < 50; i++) {
                const randomNumber = Math.floor(Math.random() * 200) + 1;
                this.recordDraw(randomNumber);
            }
        }
        
        this.updateHotNumbers();
    }
    
    static recordPlayerWin(wager, winnings, pattern, draws) {
        this.playerStats.gamesPlayed++;
        this.playerStats.gamesWon++;
        this.playerStats.totalWagered += wager;
        this.playerStats.totalWon += winnings;
        
        if (winnings > this.playerStats.bestWin) {
            this.playerStats.bestWin = winnings;
        }
        
        // Update favorite pattern
        this.updateFavoritePattern(pattern);
        
        this.saveStats();
    }
    
    static recordPlayerLoss(wager) {
        this.playerStats.gamesPlayed++;
        this.playerStats.totalWagered += wager;
        this.saveStats();
    }
    
    static updateFavoritePattern(pattern) {
        // Simple favorite pattern tracking
        this.playerStats.favoritePattern = pattern;
    }
    
    static getPlayerStats() {
        const winRate = this.playerStats.gamesPlayed > 0 ?
            (this.playerStats.gamesWon / this.playerStats.gamesPlayed * 100).toFixed(1) : 0;
        
        const netProfit = this.playerStats.totalWon - this.playerStats.totalWagered;
        
        return {
            ...this.playerStats,
            winRate: winRate,
            netProfit: netProfit,
            avgWin: this.playerStats.gamesWon > 0 ?
                Math.round(this.playerStats.totalWon / this.playerStats.gamesWon) : 0
        };
    }
    
    static displayStatistics() {
        try {
            const playerStats = this.getPlayerStats();
            
            // Update stats display if elements exist
            const totalGamesEl = document.getElementById('totalGames');
            const totalWinsEl = document.getElementById('totalWins');
            const winRateEl = document.getElementById('winRate');
            const totalWageredEl = document.getElementById('totalWagered');
            
            if (totalGamesEl) totalGamesEl.textContent = playerStats.gamesPlayed;
            if (totalWinsEl) totalWinsEl.textContent = playerStats.gamesWon;
            if (winRateEl) winRateEl.textContent = `${playerStats.winRate}%`;
            if (totalWageredEl) totalWageredEl.textContent = playerStats.totalWagered.toLocaleString();
        } catch (error) {
            console.error('Error displaying statistics:', error);
        }
    }
    
    static getNumberPrediction() {
        const hotNumbers = this.drawStats.hotNumbers;
        
        if (hotNumbers.length === 0) {
            return {
                predictedNumber: Math.floor(Math.random() * 200) + 1,
                confidence: 0,
                reason: 'No data available'
            };
        }
        
        // Weighted random selection based on frequency
        const totalWeight = hotNumbers.reduce((sum, num) => sum + num.count, 0);
        let random = Math.random() * totalWeight;
        
        for (const hotNumber of hotNumbers) {
            random -= hotNumber.count;
            if (random <= 0) {
                return {
                    predictedNumber: hotNumber.number,
                    confidence: (hotNumber.frequency * 100).toFixed(1),
                    reason: `Hot number (drawn ${hotNumber.count} times recently)`
                };
            }
        }
        
        // Fallback
        return {
            predictedNumber: hotNumbers[0].number,
            confidence: (hotNumbers[0].frequency * 100).toFixed(1),
            reason: 'Most frequent number'
        };
    }
    
    static getColdNumbers(timeWindow = '3h') {
        const windowMs = this.timeWindows[timeWindow] || this.timeWindows['3h'];
        const cutoffTime = Date.now() - windowMs;
        
        const recentDraws = this.drawStats.recentDraws.filter(
            draw => draw.timestamp >= cutoffTime
        );
        
        const drawnNumbers = new Set(recentDraws.map(draw => draw.number));
        const coldNumbers = [];
        
        // Find numbers not drawn in the time window
        for (let i = 1; i <= 200; i++) {
            if (!drawnNumbers.has(i)) {
                coldNumbers.push(i);
            }
        }
        
        return coldNumbers.slice(0, 10); // Top 10 cold numbers
    }
    
    static resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            this.drawStats = {
                totalDraws: 0,
                numberFrequency: {},
                timeBasedFrequency: {},
                recentDraws: [],
                sessionStats: [],
                hotNumbers: []
            };
            
            this.playerStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                totalWagered: 0,
                totalWon: 0,
                favoritePattern: null,
                bestWin: 0
            };
            
            this.saveStats();
            this.updateHotNumbers();
            
            UIManager.showNotification('Statistics reset', 'success');
        }
    }
}

// Initialize Stats Manager
StatsManager.init();

// Make globally available
window.StatsManager = StatsManager;
