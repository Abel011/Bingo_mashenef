// Bingo Pattern Checkers
class BingoPatterns {
    static patterns = {
        'line': { name: 'Line', check: this.checkLineBingo },
        'four-corners': { name: 'Four Corners', check: this.checkFourCorners },
        'full-house': { name: 'Full House', check: this.checkFullHouse },
        'x': { name: 'X Pattern', check: this.checkXBingo },
        'blackout': { name: 'Blackout', check: this.checkBlackout }
    };
    
    static checkLineBingo() {
        const cells = document.querySelectorAll('.cell');
        if (cells.length !== 25) return false;
        
        // Check rows
        for (let row = 0; row < 5; row++) {
            let rowComplete = true;
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                if (index === 12) continue; // Skip free space
                if (!cells[index].classList.contains('marked')) {
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
                if (!cells[index].classList.contains('marked')) {
                    colComplete = false;
                    break;
                }
            }
            if (colComplete) return true;
        }
        
        return false;
    }
    
    static checkFourCorners() {
        const cells = document.querySelectorAll('.cell');
        if (cells.length !== 25) return false;
        
        const corners = [0, 4, 20, 24];
        return corners.every(index => cells[index].classList.contains('marked'));
    }
    
    static checkFullHouse() {
        const cells = document.querySelectorAll('.cell');
        if (cells.length !== 25) return false;
        
        return Array.from(cells).every((cell, index) => {
            if (index === 12) return true; // Free space is always marked
            return cell.classList.contains('marked');
        });
    }
    
    static checkXBingo() {
        const cells = document.querySelectorAll('.cell');
        if (cells.length !== 25) return false;
        
        // Main diagonal
        for (let i = 0; i < 5; i++) {
            const index = i * 6;
            if (index !== 12 && !cells[index].classList.contains('marked')) {
                return false;
            }
        }
        
        // Anti-diagonal
        for (let i = 0; i < 5; i++) {
            const index = i * 4 + 4;
            if (index !== 12 && !cells[index].classList.contains('marked')) {
                return false;
            }
        }
        
        return true;
    }
    
    static checkBlackout() {
        const cells = document.querySelectorAll('.cell');
        if (cells.length !== 25) return false;
        
        return Array.from(cells).every(cell => cell.classList.contains('marked'));
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
    
    static validatePattern(patternName) {
        if (!this.patterns[patternName]) {
            throw new Error(`Invalid pattern: ${patternName}`);
        }
        return true;
    }
}

// Initialize and make available globally
window.bingoPatterns = BingoPatterns;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BingoPatterns;
}