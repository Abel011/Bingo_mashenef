// Bingo Pattern Checkers
class BingoPatterns {
    static patterns = {
        'line': { 
            name: 'Line', 
            check: this.checkLineBingo,
            multiplier: 5
        },
        'four-corners': { 
            name: 'Four Corners', 
            check: this.checkFourCorners,
            multiplier: 3
        },
        'full-house': { 
            name: 'Full House', 
            check: this.checkFullHouse,
            multiplier: 10
        },
        'x': { 
            name: 'X Pattern', 
            check: this.checkXBingo,
            multiplier: 7
        },
        'blackout': { 
            name: 'Blackout', 
            check: this.checkBlackout,
            multiplier: 15
        }
    };
    
    static checkLineBingo() {
        const game = GameManager.getInstance();
        
        if (!game.isPlaying || !game.hasCard || game.cardNumbers.length !== 25) {
            return false;
        }
        
        // Check rows
        for (let row = 0; row < 5; row++) {
            let rowComplete = true;
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                if (index === 12) continue; // Skip free space
                if (!game.markedNumbers.has(game.cardNumbers[index])) {
                    rowComplete = false;
                    break;
                }
            }
            if (rowComplete) return true;
        }
        
        // Check columns
        for (let col = 0; col < 5; col++) {
            let colComplete = true;
            for (let row = 0; row < 5; row++) {
                const index = row * 5 + col;
                if (index === 12) continue; // Skip free space
                if (!game.markedNumbers.has(game.cardNumbers[index])) {
                    colComplete = false;
                    break;
                }
            }
            if (colComplete) return true;
        }
        
        return false;
    }
    
    static checkFourCorners() {
        const game = GameManager.getInstance();
        
        if (!game.isPlaying || !game.hasCard || game.cardNumbers.length !== 25) {
            return false;
        }
        
        const corners = [0, 4, 20, 24]; // Indices of corners
        
        return corners.every(index => {
            if (index === 12) return true; // Center is free
            return game.markedNumbers.has(game.cardNumbers[index]);
        });
    }
    
    static checkFullHouse() {
        const game = GameManager.getInstance();
        
        if (!game.isPlaying || !game.hasCard || game.cardNumbers.length !== 25) {
            return false;
        }
        
        // All 25 cells must be marked (center is always marked as free)
        return game.cardNumbers.every((number, index) => {
            if (index === 12) return true; // Center is free
            return game.markedNumbers.has(number);
        });
    }
    
    static checkXBingo() {
        const game = GameManager.getInstance();
        
        if (!game.isPlaying || !game.hasCard || game.cardNumbers.length !== 25) {
            return false;
        }
        
        // Main diagonal (top-left to bottom-right)
        for (let i = 0; i < 5; i++) {
            const index = i * 6;
            if (index === 12) continue; // Skip center
            if (!game.markedNumbers.has(game.cardNumbers[index])) {
                return false;
            }
        }
        
        // Anti-diagonal (top-right to bottom-left)
        for (let i = 0; i < 5; i++) {
            const index = i * 4 + 4;
            if (index === 12) continue; // Skip center
            if (!game.markedNumbers.has(game.cardNumbers[index])) {
                return false;
            }
        }
        
        return true;
    }
    
    static checkBlackout() {
        const game = GameManager.getInstance();
        
        if (!game.isPlaying || !game.hasCard || game.cardNumbers.length !== 25) {
            return false;
        }
        
        // All numbers including center (center is free so always marked)
        return game.cardNumbers.every(number => {
            if (number === 0) return true; // Center (FREE)
            return game.markedNumbers.has(number);
        });
    }
    
    static checkPattern(patternName) {
        const pattern = this.patterns[patternName];
        if (!pattern || !pattern.check) {
            console.error(`Pattern checker not found: ${patternName}`);
            return false;
        }
        
        try {
            return pattern.check();
        } catch (error) {
            console.error(`Error checking pattern ${patternName}:`, error);
            return false;
        }
    }
    
    static getAllPatterns() {
        return Object.keys(this.patterns);
    }
    
    static getPatternInfo(patternName) {
        return this.patterns[patternName] || null;
    }
    
    static getPatternMultiplier(patternName) {
        const pattern = this.patterns[patternName];
        return pattern ? pattern.multiplier : 5;
    }
    
    static validatePattern(patternName) {
        if (!this.patterns[patternName]) {
            console.error(`Invalid pattern: ${patternName}`);
            return false;
        }
        return true;
    }
}

// Make globally available
window.BingoPatterns = BingoPatterns;
