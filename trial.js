document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const questionPad = document.getElementById('question_pad');
  const answerPad = document.getElementById('answer_pad');
  const questionAnswers = document.getElementById('question_answers');
  const timerDisplay = document.getElementById('timer');
  const resultDiv = document.getElementById('result');
  const scoreDisplay = document.getElementById('score');
  const totalTimeDisplay = document.getElementById('total_time');
  const retryBtn = document.getElementById('retry_btn');
  const cancelBtn = document.getElementById('cancel_btn');
  const startScreen = document.getElementById('start_screen');
  const startBtn = document.getElementById('start_btn');
  const quitBtn = document.getElementById('quit_btn');

  let questions = [];
  let curIdx = 0;
  let curQ = null;
  let correctCount = 0;
  let startTime = 0;
  let questionStartTime = 0;
  let intervalId = null;
  let isQuizActive = false;

  // Load questions
  fetch('questions.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      questions = data;
      showStartScreen();
    })
    .catch(err => {
      questionPad.textContent = 'Error: ' + err.message;
      console.error(err);
    });

  function showStartScreen() {
    isQuizActive = false;
    stopTimer();
    timerDisplay.style.display = 'none';
    startScreen.style.display = 'block';
    resultDiv.style.display = 'none';
    questionPad.textContent = 'Welcome! Click Start to begin.';
    answerPad.innerHTML = '';
    questionAnswers.innerHTML = '';
  }

  function startQuiz() {
    isQuizActive = true;
    curIdx = 0;
    correctCount = 0;
    startTime = Date.now();
    startScreen.style.display = 'none';
    timerDisplay.style.display = 'block';
    resultDiv.style.display = 'none';
    startTimer();
    loadQuestion(0);
  }

  function startTimer() {
    if (intervalId) clearInterval(intervalId);
    questionStartTime = Date.now();
    intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      timerDisplay.textContent = `Time: ${elapsed}s`;
    }, 1000);
  }

  function stopTimer() {
    if (intervalId) clearInterval(intervalId);
  }

  function loadQuestion(idx) {
    if (idx >= questions.length || !isQuizActive) {
      endQuiz();
      return;
    }

    curQ = questions[idx];
    questionPad.textContent = curQ.question;
    answerPad.innerHTML = '';
    questionAnswers.innerHTML = '';
    startTimer();

    // Create answer blocks
    curQ.answers.forEach((txt, i) => {
      const block = document.createElement('div');
      block.className = 'answer-block';
      block.textContent = txt;
      block.draggable = true;
      block.dataset.idx = i;
      block.addEventListener('dragstart', dragStart);
      block.addEventListener('dragend', dragEnd); // <-- Prevents lost blocks
      answerPad.appendChild(block);
    });

    // Create drop slots
    for (let i = 0; i < curQ.answer_divs; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.textContent = `Drop answer ${i + 1} here`;
      slot.dataset.slot = i;
      slot.addEventListener('dragover', e => e.preventDefault());
      slot.addEventListener('drop', e => drop(e));
      questionAnswers.appendChild(slot);
    }

    // Allow return to answer pad
    answerPad.addEventListener('dragover', e => e.preventDefault());
    answerPad.addEventListener('drop', e => drop(e, true));
  }

  function dragStart(e) {
    const idx = e.target.dataset.idx;
    e.dataTransfer.setData('text/plain', idx);
    e.target.classList.add('dragging');
    e.target.style.opacity = '0.3'; // Visual cue while dragging
  }

  function dragEnd(e) {
    const block = e.target;
    block.style.opacity = '';
    block.classList.remove('dragging');

    // If dropped outside valid area → return to answer pad
    if (!block.closest('.slot') && !block.closest('#answer_pad')) {
      answerPad.appendChild(block);
    }
  }

  function drop(e, toAnswerPad = false) {
    if (!isQuizActive) return;
    e.preventDefault();
    const idx = e.dataTransfer.getData('text/plain');
    const block = document.querySelector(`.answer-block[data-idx="${idx}"]`);
    if (!block) return;

    block.style.opacity = '';
    block.classList.remove('dragging');

    if (toAnswerPad) {
      answerPad.appendChild(block);
    } else {
      const slot = e.target.closest('.slot');
      if (!slot || slot.children.length) return;
      slot.textContent = '';
      slot.appendChild(block);
    }

    // Check if all slots are filled
    const totalSlots = questionAnswers.querySelectorAll('.slot').length;
    const filled = questionAnswers.querySelectorAll('.slot .answer-block').length;

    if (filled === totalSlots) {
      setTimeout(checkAnswerAndProceed, 300);
    }
  }

  function checkAnswerAndProceed() {
    const slots = questionAnswers.querySelectorAll('.slot');
    const userOrder = Array.from(slots).map(s => {
      const b = s.querySelector('.answer-block');
      return b ? +b.dataset.idx : -1;
    });

    const isCorrect = JSON.stringify(userOrder) === JSON.stringify(curQ.correct_order);

    if (isCorrect) {
      correctCount++;
      curIdx++;
      setTimeout(() => loadQuestion(curIdx), 600);
    } else {
      // Wrong: shake + reset
      questionAnswers.style.animation = 'shake 0.5s';
      setTimeout(() => {
        questionAnswers.style.animation = '';
        questionAnswers.querySelectorAll('.answer-block').forEach(b => {
          b.style.opacity = '';
          answerPad.appendChild(b);
        });
        questionAnswers.querySelectorAll('.slot').forEach((s, i) => {
          s.textContent = `Drop answer ${i + 1} here`;
        });
      }, 600);
    }
  }

  function endQuiz() {
    if (!isQuizActive) return;
    isQuizActive = false;
    stopTimer();
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(totalTime / 60);
    const secs = totalTime % 60;

    scoreDisplay.textContent = `Score: ${correctCount} / ${questions.length}`;
    totalTimeDisplay.textContent = `Total time: ${mins}m ${secs}s`;
    resultDiv.style.display = 'block';
    questionPad.textContent = 'Quiz Complete!';
    answerPad.innerHTML = '';
    questionAnswers.innerHTML = '';
    timerDisplay.style.display = 'none';
  }

  // Button Actions
  startBtn.addEventListener('click', startQuiz);
  retryBtn.addEventListener('click', startQuiz);
  cancelBtn.addEventListener('click', () => {
    if (confirm('Restart the quiz? All progress will be lost.')) {
      showStartScreen();
    }
  });
  quitBtn.addEventListener('click', () => {
    if (confirm('Quit and close this tab?')) {
      window.close();
      setTimeout(() => window.location.href = 'about:blank', 100);
    }
  });
});

// Inject shake animation
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;
document.head.appendChild(style);
