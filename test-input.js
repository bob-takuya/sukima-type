// Test the InputManager directly
import { InputManager } from './src/inputManager.js';

// Create a simple test environment
const inputElement = document.createElement('input');
inputElement.type = 'text';
inputElement.style.position = 'absolute';
inputElement.style.top = '-9999px';
document.body.appendChild(inputElement);

let characterCount = 0;
const receivedCharacters = [];

function handleCharacterAdd(char, isComposing) {
    characterCount++;
    receivedCharacters.push({ char, isComposing, timestamp: Date.now() });
    console.log(`Character ${characterCount}: "${char}" (${isComposing ? 'composing' : 'confirmed'})`);
    console.log(`Total received: ${receivedCharacters.length}`);
}

function handleCompositionUpdate(state) {
    console.log('Composition update:', state);
}

// Initialize InputManager
const inputManager = new InputManager(
    inputElement,
    handleCharacterAdd,
    handleCompositionUpdate
);

// Test functions
window.testInput = {
    single: () => {
        console.log('=== Testing single character ===');
        inputElement.focus();
        inputElement.value = 'A';
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    },
    
    multiple: () => {
        console.log('=== Testing multiple characters ===');
        inputElement.focus();
        inputElement.value = 'ABC';
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    },
    
    typing: () => {
        console.log('=== Testing typing simulation ===');
        const text = 'HELLO';
        let index = 0;
        
        function typeNext() {
            if (index < text.length) {
                inputElement.focus();
                inputElement.value = text[index];
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                index++;
                setTimeout(typeNext, 300);
            }
        }
        
        typeNext();
    },
    
    status: () => {
        console.log('=== Current Status ===');
        console.log(`Characters received: ${receivedCharacters.length}`);
        console.log('Characters:', receivedCharacters);
        console.log(`Input value: "${inputElement.value}"`);
    },
    
    clear: () => {
        console.log('=== Clearing ===');
        receivedCharacters.length = 0;
        characterCount = 0;
        inputElement.value = '';
    }
};

console.log('Test environment ready. Use:');
console.log('testInput.single() - Test single character');
console.log('testInput.multiple() - Test multiple characters');
console.log('testInput.typing() - Test typing simulation');
console.log('testInput.status() - Show current status');
console.log('testInput.clear() - Clear results');
