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

let allQuestions = [], selectedQuestions = [], curIdx = 0, curQ = null;
let correctCount = 0, startTime = 0, questionStartTime = 0, intervalId = null, isQuizActive = false;

// Fetch + Select 20 Random Easy Questions
fetch('questions.json')
  .then(r => r.ok ? r.json() : Promise.reject('Failed to load questions'))
  .then(data => {
    allQuestions = data.easy || [];
    showStartScreen();
  })
  .catch(err => {
    questionPad.textContent = 'Error: ' + err;
    console.error(err);
  });

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function showStartScreen() {
  isQuizActive = false; stopTimer(); timerDisplay.style.display = 'none';
  startScreen.style.display = 'block'; resultDiv.style.display = 'none';
  questionPad.textContent = 'You ready to code? Have fun.';
}

function startQuiz() {
  if (allQuestions.length < 20) {
    alert('Not enough questions! Need at least 20.');
    return;
  }
  selectedQuestions = shuffle([...allQuestions]).slice(0, 20);
  isQuizActive = true; curIdx = 0; correctCount = 0; startTime = Date.now();
  startScreen.style.display = 'none'; timerDisplay.style.display = 'block';
  resultDiv.style.display = 'none'; startTimer(); loadQuestion(0);
}

function startTimer() {
  if (intervalId) clearInterval(intervalId);
  questionStartTime = Date.now();
  intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    timerDisplay.textContent = `Time: ${elapsed}s`;
  }, 1000);
}

function stopTimer() { if (intervalId) clearInterval(intervalId); }

function loadQuestion(idx) {
  if (idx >= selectedQuestions.length || !isQuizActive) { endQuiz(); return; }
  curQ = selectedQuestions[idx]; questionPad.textContent = curQ.question;
  answerPad.innerHTML = ''; questionAnswers.innerHTML = ''; startTimer();

  curQ.answers.forEach((txt, i) => {
    const block = document.createElement('div');
    block.className = 'answer-block'; block.textContent = txt; block.draggable = true;
    block.dataset.idx = i; answerPad.appendChild(block);
    block.addEventListener('dragstart', dragStart);
    block.addEventListener('dragend', dragEnd);
  });

  for (let i = 0; i < curQ.answer_divs; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot'; slot.textContent = `Drop answer ${i + 1} here`;
    slot.dataset.slot = i; slot.addEventListener('dragover', e => e.preventDefault());
    slot.addEventListener('drop', drop); questionAnswers.appendChild(slot);
  }

  answerPad.addEventListener('dragover', e => e.preventDefault());
  answerPad.addEventListener('drop', e => drop(e, true));
}

function dragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.idx);
  e.target.classList.add('dragging'); e.target.style.opacity = '0.3';
}

function dragEnd(e) {
  e.target.style.opacity = ''; e.target.classList.remove('dragging');
  if (!e.target.closest('.slot') && !e.target.closest('#answer_pad')) answerPad.appendChild(e.target);
}

function drop(e, toAnswerPad = false) {
  if (!isQuizActive) return;
  e.preventDefault();
  const idx = e.dataTransfer.getData('text/plain');
  const block = document.querySelector(`.answer-block[data-idx="${idx}"]`);
  if (!block) return;
  block.style.opacity = ''; block.classList.remove('dragging');
  if (toAnswerPad) { answerPad.appendChild(block); return; }
  const slot = e.target.closest('.slot');
  if (!slot || slot.children.length) return;
  slot.textContent = ''; slot.appendChild(block);
  if (questionAnswers.querySelectorAll('.slot .answer-block').length === questionAnswers.querySelectorAll('.slot').length) {
    setTimeout(checkAnswerAndProceed, 300);
  }
}

function checkAnswerAndProceed() {
  const userOrder = Array.from(questionAnswers.querySelectorAll('.slot')).map(s => {
    const b = s.querySelector('.answer-block');
    return b ? +b.dataset.idx : -1;
  });
  const isCorrect = JSON.stringify(userOrder) === JSON.stringify(curQ.correct_order);
  if (isCorrect) {
    correctCount++; curIdx++;
    setTimeout(() => loadQuestion(curIdx), 600);
  } else {
    questionAnswers.classList.add('shake');
    setTimeout(() => {
      questionAnswers.classList.remove('shake');
      questionAnswers.querySelectorAll('.answer-block').forEach(b => answerPad.appendChild(b));
      questionAnswers.querySelectorAll('.slot').forEach((s, i) => s.textContent = `Drop answer ${i + 1} here`);
    }, 600);
  }
}

///////////////////////////////////////
function customConfirm(message) {
  return new Promise((resolve) => {
    // Create modal elements
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.65);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: rgba(12,18,28,0.95);
      padding: 20px 30px;
      border-radius: 10px;
      color: #14ffec;
      text-align: center;
      font-family: 'Fira Code', monospace;
      box-shadow: 0 0 18px rgba(20,255,236,0.3);
      animation: fadeIn .3s ease;
    `;
    box.innerHTML = `
      <p style="margin-bottom: 14px;">${message}</p>
      <button id="confirmYes" style="margin-right:10px; background:#14ffec; color:#0b0f19; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Yes</button>
      <button id="confirmNo" style="background:#ff416c; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">No</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Handle button clicks
    box.querySelector('#confirmYes').onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };
    box.querySelector('#confirmNo').onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
  });
}

//////////////////////////////////////

////////////////////////////////////////

function showGoodbyeScreen() {
  document.body.innerHTML = `
    <div style="
      display:flex; flex-direction:column; justify-content:center; align-items:center;
      height:100vh; color:#14ffec; font-family:'Fira Code', monospace;
      background: radial-gradient(circle at 20% 20%, #0b0f19 0%, #02060f 100%);
      text-align:center;
    ">
      <h2>👋 Thanks for playing!</h2>
      <p>Come back soon!</p>
      <button id="restartBtn" style="margin-top:16px; padding:12px 20px;
        background:linear-gradient(90deg, #14ffec, #0d7377);
        color:#0b0f19; border:none; border-radius:8px; cursor:pointer;">
        Restart
      </button>
    </div>
  `;

  document.getElementById('restartBtn').onclick = showStartScreen;
}

///////////////////////////////////////
function endQuiz() {
  if (!isQuizActive) return;
  isQuizActive = false; stopTimer();
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(totalTime / 60), secs = totalTime % 60;
  scoreDisplay.textContent = `Score: ${correctCount} / 20`;
  totalTimeDisplay.textContent = `Time: ${mins}m ${secs}s`;
  resultDiv.style.display = 'block'; questionPad.textContent = 'Quiz Complete!';
  answerPad.innerHTML = ''; questionAnswers.innerHTML = ''; timerDisplay.style.display = 'none';
}

// Events
startBtn.addEventListener('click', startQuiz);
retryBtn.addEventListener('click', startQuiz);
cancelBtn.addEventListener('click', async () => {
  const confirmed = await customConfirm('Restart?');
  if (confirmed) showStartScreen();
});
quitBtn.addEventListener('click', async () => {
  const confirmed = await customConfirm('Quit the game?');
  if (confirmed) {
    showGoodbyeScreen();
  }
});
// Cursor Glow
document.addEventListener('mousemove', e => {
  const glow = document.querySelector('.cursor-glow');
  glow.style.left = e.pageX + 'px'; glow.style.top = e.pageY + 'px';
});

showStartScreen();
