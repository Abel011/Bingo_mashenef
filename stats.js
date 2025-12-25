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
                hotNumbers: [],
                lastHotNumberUpdate: null
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
            '4h': 4 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };
        
        this.loadStats();
        this.setupHourlyUpdate();
        this.initializeHotNumbers();
        
        // Initial hot numbers update
        setTimeout(() => {
            this.updateHotNumbers();
        }, 1000);
        
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
    
    static setupHourlyUpdate() {
        // Save stats every 5 minutes
        setInterval(() => {
            this.saveStats();
        }, 300000);
        
        // Update hot numbers at the beginning of each hour
        this.scheduleHourlyUpdate();
        
        // Also check every minute if it's time to update
        setInterval(() => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            
            // Update at the start of each hour (minutes: 0, seconds: 0-5)
            if (minutes === 0 && seconds < 5) {
                console.log('Hourly hot numbers update triggered');
                this.updateHotNumbers();
            }
        }, 60000);
    }
    
    static scheduleHourlyUpdate() {
        const now = new Date();
        const minutesUntilNextHour = 60 - now.getMinutes();
        const secondsUntilNextHour = (minutesUntilNextHour * 60) - now.getSeconds();
        
        // Schedule next update at the beginning of the next hour
        setTimeout(() => {
            this.updateHotNumbers();
            
            // Then update every hour
            setInterval(() => {
                this.updateHotNumbers();
            }, 60 * 60 * 1000);
        }, secondsUntilNextHour * 1000);
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
            drawCount: game.drawsCompleted,
            hour: new Date(now).getHours()
        };
        
        // Update frequency
        this.drawStats.numberFrequency[number] = (this.drawStats.numberFrequency[number] || 0) + 1;
        this.drawStats.totalDraws++;
        
        // Add to recent draws
        this.drawStats.recentDraws.unshift(drawRecord);
        if (this.drawStats.recentDraws.length > 10000) {
            this.drawStats.recentDraws.pop();
        }
        
        // Update time-based frequency
        const hour = new Date(now).getHours();
        this.drawStats.timeBasedFrequency[hour] = (this.drawStats.timeBasedFrequency[hour] || 0) + 1;
        
        // Save stats periodically
        if (this.drawStats.totalDraws % 50 === 0) {
            this.saveStats();
        }
    }
    
    static updateHotNumbers() {
        console.log('Updating hot numbers based on last 4 hours...');
        
        const timeWindow = this.timeWindows['4h']; // 4-hour window
        const cutoffTime = Date.now() - timeWindow;
        
        // Filter draws from last 4 hours
        const recentDraws = this.drawStats.recentDraws.filter(
            draw => draw.timestamp >= cutoffTime
        );
        
        if (recentDraws.length === 0) {
            console.log('No draws in the last 4 hours');
            this.displayHotNumbers([]);
            return [];
        }
        
        // Calculate frequency for each number
        const frequency = {};
        recentDraws.forEach(draw => {
            frequency[draw.number] = (frequency[draw.number] || 0) + 1;
        });
        
        // Convert to array and sort by frequency (descending)
        const hotNumbers = Object.entries(frequency)
            .map(([number, count]) => ({
                number: parseInt(number),
                count: count,
                frequency: (count / recentDraws.length) * 100,
                lastDrawn: recentDraws.find(d => d.number === parseInt(number))?.timestamp || 0
            }))
            .sort((a, b) => {
                // Sort by frequency, then by count, then by most recent
                if (b.frequency !== a.frequency) return b.frequency - a.frequency;
                if (b.count !== a.count) return b.count - a.count;
                return b.lastDrawn - a.lastDrawn;
            })
            .slice(0, 10); // Top 10 hot numbers
        
        this.drawStats.hotNumbers = hotNumbers;
        this.drawStats.lastHotNumberUpdate = Date.now();
        
        // Display in UI
        this.displayHotNumbers(hotNumbers);
        
        // Update recommended numbers in quick join
        if (typeof QuickJoinManager !== 'undefined') {
            QuickJoinManager.setupRecommendedNumbers();
        }
        
        console.log(`Updated ${hotNumbers.length} hot numbers from ${recentDraws.length} draws`);
        return hotNumbers;
    }
    
    static displayHotNumbers(hotNumbers) {
        // Create or update hot numbers display
        let container = document.getElementById('hotNumbersContainer');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'hotNumbersContainer';
            container.className = 'hot-numbers-container';
            
            // Insert after stats dashboard
            const statsDashboard = document.querySelector('.stats-dashboard');
            if (statsDashboard && statsDashboard.parentNode) {
                statsDashboard.parentNode.insertBefore(container, statsDashboard.nextSibling);
            } else {
                // Fallback: add to announcement container
                const announcement = document.querySelector('.announcement-container');
                if (announcement && announcement.parentNode) {
                    announcement.parentNode.insertBefore(container, announcement.nextSibling);
                }
            }
        }
        
        if (!hotNumbers || hotNumbers.length === 0) {
            container.innerHTML = `
                <div class="section-title">
                    <span>🔥 HOT NUMBERS</span>
                    <span style="font-size:0.7rem;">Updated hourly</span>
                </div>
                <div class="hot-numbers-list">
                    <div class="no-hot-numbers">No data yet. Play more games!</div>
                </div>
            `;
            return;
        }
        
        // Format last update time
        const lastUpdate = this.drawStats.lastHotNumberUpdate || Date.now();
        const updateTime = new Date(lastUpdate);
        const timeString = updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Create hot numbers display
        let hotNumbersHTML = '';
        hotNumbers.forEach((hotNumber, index) => {
            const percentage = hotNumber.frequency.toFixed(1);
            const isVeryHot = index < 3;
            
            hotNumbersHTML += `
                <div class="hot-number-item ${isVeryHot ? 'very-hot' : ''}" 
                     title="Drawn ${hotNumber.count} times (${percentage}% of last 4 hours)">
                    <div class="hot-number-rank">${index + 1}</div>
                    <div class="hot-number-value">${hotNumber.number}</div>
                    <div class="hot-number-stats">
                        <div class="hot-number-count">${hotNumber.count}x</div>
                        <div class="hot-number-percentage">${percentage}%</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `
            <div class="section-title">
                <span>🔥 HOT NUMBERS (Last 4 Hours)</span>
                <span style="font-size:0.7rem;">Updated: ${timeString}</span>
            </div>
            <div class="hot-numbers-list">
                ${hotNumbersHTML}
                <div class="hot-numbers-info">
                    <span style="font-size:0.7rem; color:var(--text-dim)">
                        Based on ${recentDraws.length} draws | Updates hourly
                    </span>
                </div>
            </div>
        `;
    }
    
    static initializeHotNumbers() {
        // Generate some initial data if needed
        if (this.drawStats.totalDraws === 0) {
            const now = Date.now();
            const fourHoursAgo = now - (4 * 60 * 60 * 1000);
            
            // Create some realistic hot numbers data
            for (let i = 0; i < 100; i++) {
                const timestamp = fourHoursAgo + Math.random() * (4 * 60 * 60 * 1000);
                const number = Math.floor(Math.random() * 200) + 1;
                
                this.drawStats.recentDraws.push({
                    number: number,
                    timestamp: timestamp,
                    sessionId: 'init_' + i,
                    drawCount: i % 75,
                    hour: new Date(timestamp).getHours()
                });
                
                this.drawStats.numberFrequency[number] = (this.drawStats.numberFrequency[number] || 0) + 1;
                this.drawStats.totalDraws++;
            }
            
            this.saveStats();
        }
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
    
    static getNumberPrediction() {
        const hotNumbers = this.drawStats.hotNumbers || [];
        
        if (hotNumbers.length === 0) {
            return {
                predictedNumber: Math.floor(Math.random() * 200) + 1,
                confidence: 0,
                reason: 'No data available'
            };
        }
        
        // Weighted selection based on frequency
        const totalWeight = hotNumbers.reduce((sum, num) => sum + num.count, 0);
        let random = Math.random() * totalWeight;
        
        for (const hotNumber of hotNumbers) {
            random -= hotNumber.count;
            if (random <= 0) {
                return {
                    predictedNumber: hotNumber.number,
                    confidence: hotNumber.frequency.toFixed(1),
                    reason: `Hot number (drawn ${hotNumber.count} times in last 4 hours)`
                };
            }
        }
        
        return {
            predictedNumber: hotNumbers[0].number,
            confidence: hotNumbers[0].frequency.toFixed(1),
            reason: 'Most frequent number'
        };
    }
    
    static getColdNumbers() {
        const timeWindow = this.timeWindows['4h'];
        const cutoffTime = Date.now() - timeWindow;
        
        const recentDraws = this.drawStats.recentDraws.filter(
            draw => draw.timestamp >= cutoffTime
        );
        
        const drawnNumbers = new Set(recentDraws.map(draw => draw.number));
        const coldNumbers = [];
        
        // Find numbers not drawn in the last 4 hours
        for (let i = 1; i <= 200; i++) {
            if (!drawnNumbers.has(i)) {
                coldNumbers.push(i);
            }
        }
        
        return coldNumbers.slice(0, 10);
    }
    
    static resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            this.drawStats = {
                totalDraws: 0,
                numberFrequency: {},
                timeBasedFrequency: {},
                recentDraws: [],
                sessionStats: [],
                hotNumbers: [],
                lastHotNumberUpdate: null
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
