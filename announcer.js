// Bingo Announcer
class BingoAnnouncer {
    static LETTER_RANGES = {
        'B': { min: 1, max: 40, color: '#3b82f6', name: 'Blue' },
        'I': { min: 41, max: 80, color: '#6366f1', name: 'Indigo' },
        'N': { min: 81, max: 120, color: '#10b981', name: 'Green' },
        'G': { min: 121, max: 160, color: '#f59e0b', name: 'Gold' },
        'O': { min: 161, max: 200, color: '#ef4444', name: 'Orange' }
    };
    
    static init() {
        console.log('Bingo Announcer initialized');
        return true;
    }
    
    static getLetterForNumber(number) {
        for (const [letter, range] of Object.entries(this.LETTER_RANGES)) {
            if (number >= range.min && number <= range.max) {
                return {
                    letter: letter,
                    color: range.color,
                    name: range.name,
                    range: `${range.min}-${range.max}`
                };
            }
        }
        return { letter: '?', color: '#94a3b8', name: 'Unknown', range: 'N/A' };
    }
    
    static getColumnRange(letter) {
        return this.LETTER_RANGES[letter] || { min: 1, max: 200 };
    }
    
    static announceNumber(number) {
        const letterInfo = this.getLetterForNumber(number);
        
        // Play announcement sound
        this.playAnnouncementSound(letterInfo.letter);
        
        // Log to console
        console.log(`🎯 BINGO CALL: ${letterInfo.letter}-${number}`);
        
        return `${letterInfo.letter}-${number}`;
    }
    
    static playAnnouncementSound(letter) {
        // Simple beep sound implementation
        try {
            // Check if AudioContext is available
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const context = new AudioContextClass();
                
                // Only play if context is not suspended (user interaction required)
                if (context.state === 'suspended') {
                    context.resume();
                }
                
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                // Different frequencies for different letters
                const frequencies = {
                    'B': 440,  // A4
                    'I': 493.88, // B4
                    'N': 523.25, // C5
                    'G': 587.33, // D5
                    'O': 659.25  // E5
                };
                
                oscillator.frequency.value = frequencies[letter] || 440;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
                
                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + 0.3);
            }
        } catch (error) {
            // Audio not supported or blocked - silent fail
            console.log('Audio not supported or blocked');
        }
    }
    
    static getRandomNumberFromColumn(letter) {
        const range = this.LETTER_RANGES[letter];
        if (!range) return Math.floor(Math.random() * 200) + 1;
        
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }
    
    static getColumnStats(letter) {
        const range = this.LETTER_RANGES[letter];
        if (!range) return null;
        
        const game = GameManager.getInstance();
        let drawnInColumn = 0;
        
        game.drawnNumbers.forEach(number => {
            if (number >= range.min && number <= range.max) {
                drawnInColumn++;
            }
        });
        
        return {
            totalNumbers: range.max - range.min + 1,
            drawn: drawnInColumn,
            percentage: game.drawsCompleted > 0 ? 
                ((drawnInColumn / game.drawsCompleted) * 100).toFixed(1) : '0.0'
        };
    }
    
    static getAllColumns() {
        return Object.keys(this.LETTER_RANGES);
    }
}

// Make globally available
window.BingoAnnouncer = BingoAnnouncer;
