// Statistics and Analytics Manager
class StatsManager {
    static drawStats = {
        totalDraws: 0,
        numberFrequency: {},
        timeBasedFrequency: {},
        recentDraws: [],
        sessionStats: [],
        hotNumbers: []
    };
    
    static playerStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        totalWagered: 0,
        totalWon: 0,
        favoritePattern: null,
        bestWin: 0
    };
    
    static timeWindows = {
        '1h': 60 * 60 * 1000,
        '3h': 3 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
    };
    
    static init() {
        this.loadStats();
        this.setupAutoUpdate();
        this.initializeHotNumbers();
    }
    
    static loadStats() {
        try {
            const savedStats = localStorage.getItem('bingo_stats');
            if (savedStats) {
                const parsed = JSON.parse(savedStats);
                this.drawStats = { ...this.drawStats, ...parsed.drawStats };
                this.playerStats = { ...this.playerStats, ...parsed.playerStats };
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
        const drawRecord = {
            number: number,
            timestamp: now,
            sessionId: GameSession.sessionId,
            drawCount: GameSession.drawCount
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
        
        // Update hot numbers
        this.updateHotNumbers();
        
        // Save stats
        this.saveStats();
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
                frequency: count / recentDraws.length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 hot numbers
        
        this.drawStats.hotNumbers = hotNumbers;
        
        // Update UI
        this.displayHotNumbers();
        
        return hotNumbers;
    }
    
    static displayHotNumbers() {
        const container = document.getElementById('hotNumbers');
        if (!container) return;
        
        const hotNumbers = this.drawStats.hotNumbers;
        
        if (hotNumbers.length === 0) {
            container.innerHTML = '<div class="no-hot-numbers">No data yet</div>';
            return;
        }
        
        let html = '';
        hotNumbers.forEach((hotNumber, index) => {
            const isHottest = index === 0;
            const frequencyPercent = (hotNumber.frequency * 100).toFixed(1);
            
            html += `
                <div class="hot-number ${isHottest ? 'hottest' : ''}" 
                     data-frequency="${frequencyPercent}%"
                     title="Drawn ${hotNumber.count} times (${frequencyPercent}%)">
                    ${hotNumber.number}
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Update time display
        const timeDisplay = document.getElementById('hotNumbersTime');
        if (timeDisplay) {
            timeDisplay.textContent = 'Updated now';
        }
    }
    
    static displayHotNumbersAnalysis() {
        const container = document.getElementById('hotNumbersAnalysis');
        if (!container) return;
        
        const hotNumbers = this.drawStats.hotNumbers.slice(0, 20); // Top 20
        
        if (hotNumbers.length === 0) {
            container.innerHTML = '<div class="no-analysis">No analysis data yet</div>';
            return;
        }
        
        let html = '';
        hotNumbers.forEach((hotNumber, index) => {
            const probability = (hotNumber.frequency * 100).toFixed(1);
            const isHot = index < 5;
            
            html += `
                <div class="hot-number-stat ${isHot ? 'hottest' : ''}">
                    <div class="hot-number-value">${hotNumber.number}</div>
                    <div class="hot-number-prob">${probability}%</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Update probability info
        this.updateProbabilityInfo();
    }
    
    static updateProbabilityInfo() {
        const hotNumbers = this.drawStats.hotNumbers;
        
        if (hotNumbers.length === 0) {
            document.getElementById('nextNumberProb').textContent = '0%';
            document.getElementById('avgDrawsWin').textContent = '0';
            return;
        }
        
        // Calculate next number probability (weighted average)
        const totalFrequency = hotNumbers.reduce((sum, num) => sum + num.frequency, 0);
        const avgProbability = totalFrequency > 0 ? 
            (totalFrequency / hotNumbers.length * 100).toFixed(1) : '0';
        
        // Calculate average draws to win (based on pattern statistics)
        const history = HistoryManager.getWinStats();
        const avgDraws = history.totalGames > 0 ? 
            Math.round(GameSession.maxDraws * 0.6) : 35; // Estimated
        
        document.getElementById('nextNumberProb').textContent = `${avgProbability}%`;
        document.getElementById('avgDrawsWin').textContent = avgDraws;
    }
    
    static initializeHotNumbers() {
        // Initialize with some random data for demonstration
        if (this.drawStats.totalDraws === 0) {
            for (let i = 0; i < 100; i++) {
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
        // In a real implementation, track pattern frequency
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
        const playerStats = this.getPlayerStats();
        const drawStats = this.drawStats;
        
        // Update stats display
        document.getElementById('totalGames').textContent = playerStats.gamesPlayed;
        document.getElementById('totalWins').textContent = playerStats.gamesWon;
        document.getElementById('winRate').textContent = `${playerStats.winRate}%`;
        document.getElementById('totalWagered').textContent = playerStats.totalWagered.toLocaleString();
        
        // Additional stats could be added here
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsManager;
}