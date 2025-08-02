// Boot-up animace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
  const bootLines = document.querySelectorAll('.boot-line');
  
  // Animace boot sekvence
  bootLines.forEach((line, index) => {
    setTimeout(() => {
      line.style.animationDelay = `${index * 0.5}s`;
      line.style.opacity = '1';
    }, index * 500);
  });
  
  // Po dokončení boot sekvence zobrazit prompt
  setTimeout(() => {
    const promptSection = document.querySelector('.prompt-section');
    const outputText = document.getElementById('outputText');
    const tip = document.querySelector('.tip');
    
    promptSection.style.opacity = '1';
    outputText.textContent = '[READY] Deep Thought is ready to answer your questions.';
    tip.style.opacity = '1';
  }, bootLines.length * 500 + 1000);
});

// Přidat styling pro animace
const style = document.createElement('style');
style.textContent = `
  .prompt-section, .tip {
    opacity: 0;
    transition: opacity 1s ease;
  }
  
  #outputText {
    border: 1px solid #00ff41;
    background: rgba(0, 255, 65, 0.1);
    color: #00ff41;
  }
`;
document.head.appendChild(style);
