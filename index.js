(function(){
  const tests = [
    { id:1, title:'Test 1', pro:false },
    { id:2, title:'Test 2', pro:false },
    { id:3, title:'Test 3', pro:true },
    { id:4, title:'Test 4', pro:false },
    { id:5, title:'Test 5', pro:false },
    { id:6, title:'Test 6', pro:true },
    { id:7, title:'Test 7', pro:true },
    { id:8, title:'Test 8', pro:true },
    { id:9, title:'Test 9', pro:true },
    { id:10, title:'Test 10', pro:true }
  ];

  const partConfig = [
    { key:'all', name:'Chọn tất cả 7 Part', count:'200 câu', section:'ALL', full:true },
    { key:'part1', name:'Part 1', count:'6 câu', section:'LISTENING' },
    { key:'part2', name:'Part 2', count:'25 câu', section:'LISTENING' },
    { key:'part3', name:'Part 3', count:'39 câu', section:'LISTENING' },
    { key:'part4', name:'Part 4', count:'30 câu', section:'LISTENING' },
    { key:'part5', name:'Part 5', count:'30 câu', section:'READING' },
    { key:'part6', name:'Part 6', count:'16 câu', section:'READING' },
    { key:'part7', name:'Part 7', count:'54 câu', section:'READING' }
  ];

  let demoQuestions = [];
  let bankEts2026 = [];
  let bankEts2024 = [];
  let currentSeries = 'ets2026';

  const homePage = document.getElementById('homePage');
  const examPage = document.getElementById('examPage');
  const testGrid = document.getElementById('testGrid');
  const searchInput = document.getElementById('searchInput');

  const modeModal = document.getElementById('modeModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalTestName = document.getElementById('modalTestName');

  const tabExam = document.getElementById('tabExam');
  const tabPractice = document.getElementById('tabPractice');
  const examPanel = document.getElementById('examPanel');
  const practicePanel = document.getElementById('practicePanel');
  const practiceNote = document.getElementById('practiceNote');

  const examPartList = document.getElementById('examPartList');
  const practicePartList = document.getElementById('practicePartList');

  const startFullBtn = document.getElementById('startFullBtn');
  const startPartExamBtn = document.getElementById('startPartExamBtn');
  const startPracticeBtn = document.getElementById('startPracticeBtn');

  const examPageTitle = document.getElementById('examPageTitle');
  const examPageMode = document.getElementById('examPageMode');
  const examPagePart = document.getElementById('examPagePart');
  const questionCounter = document.getElementById('questionCounter');
  const questionPartTag = document.getElementById('questionPartTag');
  const questionHeadTitle = document.getElementById('questionHeadTitle');
  const questionImage = document.getElementById('questionImage');
  const questionText = document.getElementById('questionText');
  const answersWrap = document.getElementById('answersWrap');
  const explainBox = document.getElementById('explainBox');
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const resultBox = document.getElementById('resultBox');
  const resultScore = document.getElementById('resultScore');
  const resultModeText = document.getElementById('resultModeText');
  const examTimer = document.getElementById('examTimer');
  const backHomeBtn = document.getElementById('backHomeBtn');
  const seriesTabs = document.getElementById('seriesTabs');
  const openQuestionListBtn = document.getElementById('openQuestionListBtn');
  const qDrawerBackdrop = document.getElementById('qDrawerBackdrop');
  const qDrawer = document.getElementById('qDrawer');
  const closeQDrawerBtn = document.getElementById('closeQDrawerBtn');
  const qDrawerMeta = document.getElementById('qDrawerMeta');
  const qDrawerGrid = document.getElementById('qDrawerGrid');

  let currentTest = null;
  let currentMode = 'exam';
  let selectedExamPart = '';
  let selectedPracticePart = '';
  let examPartPicked = false;
  let practicePartPicked = false;

  let activeQuestions = [];
  let currentQuestionIndex = 0;
  let userAnswers = [];
  let hasSubmitted = false;
  let qDrawerOpen = false;
  let countdownTimer = null;
  let remainingSeconds = 0;

  function cleanExplainText(text){
    if(!text) return '';
    let t = String(text).replace(/\r/g, '');
    // Remove translation blocks (Vietnamese) if present
    t = t.replace(/\n?Dịch nghĩa:\n[\s\S]*?(?=\n\d{3}\n|\nPART\s*\d|$)/gi, '');
    t = t.replace(/\n?Dịch đáp án:\n[\s\S]*?(?=\n=>\s*Đáp án|\n\d{3}\n|\nPART\s*\d|$)/gi, '');
    // Remove common fillers
    t = t.replace(/^\s*Giải thích chi tiết đáp án\s*/gim, '');
    t = t.replace(/^\s*Dịch đáp án:\s*/gim, '');
    t = t.replace(/^\s*Dịch nghĩa:\s*/gim, '');
    return t.trim();
  }

  function normalizeQuestionBank(arr){
    if(!Array.isArray(arr)) return [];
    return arr.map(q => ({ ...q, explain: cleanExplainText(q.explain) }));
  }

  function parseDetailedExplainMap(raw, minId, maxId){
    const map = new Map();
    const lines = String(raw || '').split(/\r?\n/).map(s => s.trimEnd());
    let i = 0;

    function isQuestionIdLine(line){
      if(!/^\d{1,3}$/.test(line || '')) return false;
      const n = Number(line);
      return n >= minId && n <= maxId;
    }

    while(i < lines.length){
      const line = (lines[i] || '').trim();
      if(!isQuestionIdLine(line)){
        i++;
        continue;
      }

      const qid = Number(line);
      i++;
      const block = [];
      while(i < lines.length){
        const cur = (lines[i] || '').trim();
        if(isQuestionIdLine(cur)) break;
        if(/^PART\s*\d/i.test(cur)) break;
        if(/^\d+\s*-\s*\d+/.test(cur)) break;
        block.push(lines[i]);
        i++;
      }

      const text = block.join('\n').trim();
      const idx = text.indexOf('Giải thích chi tiết đáp án');
      let detail = idx >= 0 ? text.slice(idx) : text;
      detail = detail.replace(/\n?Dịch nghĩa:\n[\s\S]*$/i, '').trim();
      detail = detail.replace(/^\s*Giải thích chi tiết đáp án\s*/i, '').trim();
      if(detail){
        map.set(qid, detail);
      }
    }
    return map;
  }

  async function loadDetailedExplainMaps(){
    const merged = new Map();
    try{
      const readingRes = await fetch('reading.txt');
      if(readingRes.ok){
        const readingRaw = await readingRes.text();
        const readingMap = parseDetailedExplainMap(readingRaw, 101, 200);
        readingMap.forEach((v, k) => merged.set(k, v));
      }
    }catch(err){
      console.warn('Không tải được reading.txt để lấy giải thích chi tiết.', err);
    }

    try{
      const listeningRes = await fetch('listening.txt');
      if(listeningRes.ok){
        const listeningRaw = await listeningRes.text();
        const listeningMap = parseDetailedExplainMap(listeningRaw, 1, 100);
        listeningMap.forEach((v, k) => merged.set(k, v));
      }
    }catch(err){
      console.warn('Không tải được listening.txt để lấy giải thích chi tiết.', err);
    }
    return merged;
  }

  function attachDetailedExplain(bank, explainMap){
    if(!Array.isArray(bank) || !(explainMap instanceof Map)) return bank;
    return bank.map(q => {
      const detailed = explainMap.get(Number(q.id));
      if(!detailed) return q;
      return { ...q, explain: detailed };
    });
  }

  function buildExplainText(q){
    const raw = (q && q.explain ? String(q.explain) : '').trim();
    const shortOnlyAnswer = /^=>\s*Đáp án\s*\([A-D]\)\s*$/i.test(raw);
    if(raw && !shortOnlyAnswer){
      return raw;
    }
    const correctIdx = typeof q.correct === 'number' ? q.correct : 0;
    const letters = ['A','B','C','D'];
    const correctLetter = letters[correctIdx] || 'A';
    const correctText = Array.isArray(q.answers) ? (q.answers[correctIdx] || '') : '';
    return 'Đáp án đúng là ' + correctLetter + (correctText ? ': ' + correctText : '.');
  }

  function formatTime(totalSeconds){
    const sec = Math.max(0, totalSeconds | 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if(h > 0){
      return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function stopCountdown(){
    if(countdownTimer){
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function updateTimerChip(){
    if(!examTimer) return;
    examTimer.textContent = formatTime(remainingSeconds);
  }

  function startCountdown(seconds){
    stopCountdown();
    remainingSeconds = Math.max(0, seconds | 0);
    updateTimerChip();

    countdownTimer = setInterval(function(){
      remainingSeconds -= 1;
      updateTimerChip();
      if(remainingSeconds <= 0){
        stopCountdown();
        if(!hasSubmitted){
          submitExam();
          alert('Hết thời gian làm bài. Hệ thống đã tự nộp bài.');
        }
      }
    }, 1000);
  }

  function renderQuestionList(){
    if(!qDrawerMeta || !qDrawerGrid) return;
    const total = activeQuestions.length;
    const answered = userAnswers.filter(a => a !== null && a !== undefined).length;
    const unanswered = total - answered;
    qDrawerMeta.textContent = `Đã làm: ${answered} • Chưa làm: ${unanswered} • Tổng: ${total}`;

    qDrawerGrid.innerHTML = '';
    for(let i = 0; i < total; i++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qbtn';
      btn.textContent = String(i + 1);

      const isAnswered = userAnswers[i] !== null && userAnswers[i] !== undefined;
      btn.classList.toggle('is-answered', isAnswered);
      btn.classList.toggle('is-unanswered', !isAnswered);
      btn.classList.toggle('is-current', i === currentQuestionIndex);

      if(hasSubmitted){
        const q = activeQuestions[i];
        if(isAnswered && userAnswers[i] === q.correct) btn.classList.add('is-correct');
        if(isAnswered && userAnswers[i] !== q.correct) btn.classList.add('is-wrong');
      }

      btn.addEventListener('click', function(){
        currentQuestionIndex = i;
        renderQuestion();
        setQDrawer(false);
      });
      qDrawerGrid.appendChild(btn);
    }
  }

  function setQDrawer(open){
    qDrawerOpen = open;
    if(!qDrawer || !qDrawerBackdrop) return;
    qDrawer.classList.toggle('show', open);
    qDrawerBackdrop.classList.toggle('show', open);
    qDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if(open) renderQuestionList();
  }

  function applyQuestionBank(series){
    currentSeries = series;
    demoQuestions = series === 'ets2024' ? bankEts2024 : bankEts2026;
  }

  function renderTests(items){
    testGrid.innerHTML = '';
    items.forEach(test => {
      const card = document.createElement('div');
      card.className = 'test-card';
      card.setAttribute('data-title', test.title.toLowerCase());

      card.innerHTML = `
        ${test.pro ? '<div class="pro-badge">PRO</div>' : ''}
        <h3>${test.title}</h3>
        <div class="meta-row">
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
              <path d="M14 2v5h5"></path>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
            <span>200 câu</span>
          </div>
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="12,7 12,12 15,14"></polyline>
            </svg>
            <span>120 phút</span>
          </div>
        </div>
        <div class="card-status">Chưa làm</div>
        <div class="card-actions">
          <button class="btn btn-main btn-exam" data-id="${test.id}" data-mode="exam" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
              <path d="M14 2v5h5"></path>
            </svg>
            <span>Luyện thi</span>
          </button>
          <button class="btn btn-main btn-practice" data-id="${test.id}" data-mode="practice" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="8"></circle>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
            <span>Luyện tập</span>
          </button>
        </div>
      `;
      testGrid.appendChild(card);
    });

    testGrid.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', function(){
        const id = Number(btn.getAttribute('data-id'));
        const mode = btn.getAttribute('data-mode');
        currentTest = tests.find(t => t.id === id);
        openModal(mode);
      });
    });
  }

  function renderPartList(container, selectedKey, picked){
    container.innerHTML = '';
    let currentSection = '';

    partConfig.forEach(part => {
      if(part.section !== currentSection && !part.full){
        currentSection = part.section;
        const label = document.createElement('div');
        label.className = 'full-width section-label';
        label.textContent = currentSection;
        container.appendChild(label);
      }

      const item = document.createElement('div');
      const isAllSelected = picked && selectedKey === 'all' && !part.full;
      item.className = 'part-item' + (part.key === selectedKey || isAllSelected ? ' selected' : '') + (part.full ? ' full-width' : '');
      item.setAttribute('data-key', part.key);
      item.innerHTML = `
        <div class="part-left">
          <div class="radio-dot"></div>
          <div class="part-name">${part.name}</div>
        </div>
        <div class="part-count">${part.count}</div>
      `;
      container.appendChild(item);
    });
  }

  function bindPartEvents(){
    examPartList.querySelectorAll('.part-item').forEach(item => {
      item.addEventListener('click', function(){
        selectedExamPart = item.getAttribute('data-key');
        examPartPicked = true;
        renderPartList(examPartList, selectedExamPart, examPartPicked);
        bindPartEvents();
      });
    });

    practicePartList.querySelectorAll('.part-item').forEach(item => {
      item.addEventListener('click', function(){
        selectedPracticePart = item.getAttribute('data-key');
        practicePartPicked = true;
        renderPartList(practicePartList, selectedPracticePart, practicePartPicked);
        bindPartEvents();
      });
    });
  }

  function openModal(mode){
    modalTestName.textContent = currentTest ? currentTest.title : 'Test';
    modeModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    if(mode === 'practice'){
      switchModalMode('practice');
    }else{
      switchModalMode('exam');
    }
  }

  function closeModal(){
    modeModal.classList.remove('show');
    document.body.style.overflow = '';
  }

  function switchModalMode(mode){
    currentMode = mode;
    if(mode === 'practice'){
      tabPractice.classList.add('active');
      tabExam.classList.remove('active');
      practicePanel.classList.remove('hidden');
      examPanel.classList.add('hidden');
      practiceNote.classList.add('show');
    }else{
      tabExam.classList.add('active');
      tabPractice.classList.remove('active');
      examPanel.classList.remove('hidden');
      practicePanel.classList.add('hidden');
      practiceNote.classList.remove('show');
    }
  }

  function getQuestionsByPart(partKey){
    if(partKey === 'all') return demoQuestions.slice();
    return demoQuestions.filter(q => q.part === partKey);
  }

  function getPartDisplay(partKey){
    if(partKey === 'all') return 'All Parts';
    const item = partConfig.find(p => p.key === partKey);
    return item ? item.name : partKey;
  }

  function startExam(mode, partKey, fullTest){
    closeModal();

    homePage.classList.add('page-hidden');
    examPage.classList.remove('page-hidden');

    currentMode = mode;
    activeQuestions = fullTest ? demoQuestions.slice() : getQuestionsByPart(partKey);
    currentQuestionIndex = 0;
    userAnswers = new Array(activeQuestions.length).fill(null);
    hasSubmitted = false;

    examPageTitle.textContent = currentTest ? currentTest.title : 'Test';
    examPageMode.textContent = mode === 'practice' ? 'Luyện tập' : 'Luyện thi';
    examPagePart.textContent = fullTest ? 'Full Test' : getPartDisplay(partKey);

    if(mode === 'exam'){
      const totalSeconds = fullTest ? 120 * 60 : Math.max(60, activeQuestions.length * 36);
      startCountdown(totalSeconds);
    }else{
      stopCountdown();
      remainingSeconds = 0;
      updateTimerChip();
    }

    renderQuestion();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderQuestion(){
    const q = activeQuestions[currentQuestionIndex];
    if(!q) return;

    questionCounter.textContent = 'Câu ' + (currentQuestionIndex + 1) + ' / ' + activeQuestions.length;
    questionPartTag.textContent = q.partLabel;
    questionHeadTitle.textContent = q.title;
    const imgWrap = questionImage.closest('.exam-image-wrap');
    if(q.image){
      questionImage.src = q.image;
      imgWrap.classList.remove('is-hidden');
    }else{
      questionImage.removeAttribute('src');
      imgWrap.classList.add('is-hidden');
    }
    questionText.textContent = q.question;

    const progress = ((currentQuestionIndex + 1) / activeQuestions.length) * 100;
    progressFill.style.width = progress + '%';

    answersWrap.innerHTML = '';
    const letters = ['A','B','C','D'];

    q.answers.forEach((answer, index) => {
      const item = document.createElement('div');
      item.className = 'answer-item';

      const selected = userAnswers[currentQuestionIndex] === index;
      if(selected) item.classList.add('selected');

      if(currentMode === 'practice' && userAnswers[currentQuestionIndex] !== null){
        if(index === q.correct){
          item.classList.add('correct');
        }else if(index === userAnswers[currentQuestionIndex]){
          item.classList.add('wrong');
        }
      }

      if(hasSubmitted){
        if(index === q.correct){
          item.classList.add('correct');
        }else if(index === userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex] !== q.correct){
          item.classList.add('wrong');
        }
      }

      item.innerHTML = `
        <div class="answer-letter">${letters[index]}</div>
        <div class="answer-text">${answer}</div>
      `;

      item.addEventListener('click', function(){
        if(hasSubmitted) return;
        userAnswers[currentQuestionIndex] = index;
        renderQuestion();
      });

      answersWrap.appendChild(item);
    });

    const selectedAnswer = userAnswers[currentQuestionIndex];
    const isWrongAnswer = selectedAnswer !== null && selectedAnswer !== q.correct;

    if((currentMode === 'practice' && isWrongAnswer) || (currentMode === 'exam' && hasSubmitted && isWrongAnswer)){
      explainBox.classList.add('show');
      explainBox.innerHTML = buildExplainText(q);
    }else{
      explainBox.classList.remove('show');
      explainBox.innerHTML = '';
    }

    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === activeQuestions.length - 1;
    resultBox.classList.remove('show');

    if(qDrawerOpen) renderQuestionList();
  }

  function submitExam(){
    hasSubmitted = true;
    stopCountdown();
    let correct = 0;
    const wrongDetails = [];
    activeQuestions.forEach((q, index) => {
      if(userAnswers[index] === q.correct){
        correct++;
      }else{
        const chosen = userAnswers[index];
        const chosenLabel = chosen === null || chosen === undefined ? 'Chưa chọn' : ['A','B','C','D'][chosen];
        const correctLabel = ['A','B','C','D'][q.correct];
        wrongDetails.push(
          '<div style="margin-top:10px;padding:10px;border:1px solid #e1e8f0;border-radius:10px;background:#fff;">' +
            '<div><strong>Câu ' + (index + 1) + '</strong> - Bạn chọn: ' + chosenLabel + ' | Đáp án đúng: ' + correctLabel + '</div>' +
            '<div style="margin-top:6px;">' + buildExplainText(q) + '</div>' +
          '</div>'
        );
      }
    });

    renderQuestion();
    resultBox.classList.add('show');
    resultScore.textContent = 'Số câu đúng: ' + correct + ' / ' + activeQuestions.length;
    if(currentMode === 'practice'){
      resultModeText.textContent = 'Chế độ luyện tập: đáp án và giải thích đã hiện ngay sau mỗi câu.';
      return;
    }

    if(wrongDetails.length === 0){
      resultModeText.textContent = 'Chế độ luyện thi: bạn làm đúng tất cả câu.';
    }else{
      resultModeText.innerHTML =
        '<div style="font-weight:700;margin-bottom:8px;">Các câu sai và giải thích:</div>' +
        wrongDetails.join('');
    }
  }

  searchInput.addEventListener('input', function(){
    const keyword = searchInput.value.trim().toLowerCase();
    testGrid.querySelectorAll('.test-card').forEach(card => {
      const title = card.getAttribute('data-title') || '';
      card.style.display = title.includes(keyword) ? '' : 'none';
    });
  });

  closeModalBtn.addEventListener('click', closeModal);
  modeModal.addEventListener('click', function(e){
    if(e.target === modeModal) closeModal();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeModal();
  });

  tabExam.addEventListener('click', function(){ switchModalMode('exam'); });
  tabPractice.addEventListener('click', function(){ switchModalMode('practice'); });

  startFullBtn.addEventListener('click', function(){
    startExam('exam', 'all', true);
  });

  startPartExamBtn.addEventListener('click', function(){
    if(!selectedExamPart){
      alert('Bạn hãy chọn Part trước khi bắt đầu thi theo Part.');
      return;
    }
    startExam('exam', selectedExamPart, false);
  });

  startPracticeBtn.addEventListener('click', function(){
    if(!selectedPracticePart){
      alert('Bạn hãy chọn Part trước khi bắt đầu luyện tập.');
      return;
    }
    startExam('practice', selectedPracticePart, false);
  });

  prevBtn.addEventListener('click', function(){
    if(currentQuestionIndex > 0){
      currentQuestionIndex--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener('click', function(){
    if(currentQuestionIndex < activeQuestions.length - 1){
      currentQuestionIndex++;
      renderQuestion();
    }
  });

  submitBtn.addEventListener('click', submitExam);

  backHomeBtn.addEventListener('click', function(){
    examPage.classList.add('page-hidden');
    homePage.classList.remove('page-hidden');
    hasSubmitted = false;
    stopCountdown();
    remainingSeconds = 0;
    updateTimerChip();
    resultBox.classList.remove('show');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  async function loadDataJson(){
    const res = await fetch('data.json');
    if(!res.ok) throw new Error('Không tải được data.json');
    const data = await res.json();
    if(Array.isArray(data)){
      bankEts2026 = normalizeQuestionBank(data);
      bankEts2024 = [];
    }else{
      bankEts2026 = normalizeQuestionBank(Array.isArray(data.ets2026) ? data.ets2026 : []);
      bankEts2024 = normalizeQuestionBank(Array.isArray(data.ets2024) ? data.ets2024 : []);
    }
    const detailedMap = await loadDetailedExplainMaps();
    bankEts2024 = attachDetailedExplain(bankEts2024, detailedMap);
    applyQuestionBank('ets2026');
  }

  async function init(){
    try{
      await loadDataJson();
    }catch(err){
      console.error(err);
    }
    if(seriesTabs){
      seriesTabs.querySelectorAll('.tab[data-series]').forEach(function(tab){
        tab.addEventListener('click', function(){
          const series = tab.getAttribute('data-series');
          if(!series || series === currentSeries) return;
          seriesTabs.querySelectorAll('.tab[data-series]').forEach(function(t){
            t.classList.toggle('active', t.getAttribute('data-series') === series);
          });
          applyQuestionBank(series);
        });
      });
    }

    if(openQuestionListBtn){
      openQuestionListBtn.addEventListener('click', function(){ setQDrawer(true); });
    }
    if(closeQDrawerBtn){
      closeQDrawerBtn.addEventListener('click', function(){ setQDrawer(false); });
    }
    if(qDrawerBackdrop){
      qDrawerBackdrop.addEventListener('click', function(){ setQDrawer(false); });
    }
    renderTests(tests);
    renderPartList(examPartList, selectedExamPart, examPartPicked);
    renderPartList(practicePartList, selectedPracticePart, practicePartPicked);
    bindPartEvents();
    updateTimerChip();
  }

  init();
})();
