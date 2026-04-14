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
  const questionAudio = document.getElementById('questionAudio');
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
  const resultPage = document.getElementById('resultPage');
  const resultPageSummary = document.getElementById('resultPageSummary');
  const resultPageDetails = document.getElementById('resultPageDetails');
  const reviewAnswersBtn = document.getElementById('reviewAnswersBtn');
  const resultBackHomeBtn = document.getElementById('resultBackHomeBtn');
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

  function showResultPage(summaryText){
    if(!resultPage) return;
    examPage.classList.add('page-hidden');
    resultPage.classList.remove('page-hidden');
    if(resultPageSummary) resultPageSummary.textContent = summaryText || '';
    renderResultPageContent();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function answerLetter(idx){
    if(idx === null || idx === undefined) return null;
    return ['A','B','C','D'][idx] || '?';
  }

  function renderResultPageContent(){
    if(!resultPageDetails) return;
    resultPageDetails.innerHTML = '';

    const hint = document.createElement('p');
    hint.className = 'result-page-hint';
    hint.textContent = 'Nhấn vào số câu để xem giải thích chi tiết.';

    const legend = document.createElement('div');
    legend.className = 'result-legend';
    legend.innerHTML = ''
      + '<span class="result-legend-item"><span class="result-dot is-correct"></span> Đúng</span>'
      + '<span class="result-legend-item"><span class="result-dot is-wrong"></span> Sai</span>'
      + '<span class="result-legend-item"><span class="result-dot is-unanswered"></span> Chưa làm</span>';

    const scroll = document.createElement('div');
    scroll.className = 'result-grid-scroll';

    let lastPart = null;
    let sectionGrid = null;

    for(let i = 0; i < activeQuestions.length; i++){
      const q = activeQuestions[i];
      const part = q.part || 'unknown';
      if(part !== lastPart){
        lastPart = part;
        const label = document.createElement('div');
        label.className = 'qdrawer-section-label';
        label.textContent = getPartDrawerTitle(part, q);
        scroll.appendChild(label);

        sectionGrid = document.createElement('div');
        sectionGrid.className = 'qdrawer-section-grid result-part-grid';
        scroll.appendChild(sectionGrid);
      }

      const ua = userAnswers[i];
      const answered = ua !== null && ua !== undefined;
      const isCorrect = answered && ua === q.correct;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'result-qcell';
      if(answered){
        cell.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
      }else{
        cell.classList.add('is-unanswered');
      }
      cell.textContent = String(i + 1);
      cell.setAttribute('data-q', String(i));
      cell.setAttribute('aria-label', 'Câu ' + (i + 1));
      sectionGrid.appendChild(cell);
    }

    const panel = document.createElement('div');
    panel.id = 'resultExplainPanel';
    panel.className = 'result-explain-panel';
    panel.hidden = true;
    panel.innerHTML = '<div class="result-explain-inner"></div>';

    resultPageDetails.appendChild(hint);
    resultPageDetails.appendChild(legend);
    resultPageDetails.appendChild(scroll);
    resultPageDetails.appendChild(panel);
  }

  function openResultExplain(index){
    const panel = document.getElementById('resultExplainPanel');
    if(!panel || !resultPageDetails) return;
    const q = activeQuestions[index];
    if(!q) return;
    const inner = panel.querySelector('.result-explain-inner');
    if(!inner) return;

    resultPageDetails.querySelectorAll('.result-qcell').forEach(function(el){
      el.classList.toggle('is-active', Number(el.getAttribute('data-q')) === index);
    });

    const ua = userAnswers[index];
    const chosenLabel = ua === null || ua === undefined ? 'Chưa chọn' : answerLetter(ua);
    const correctLabel = answerLetter(q.correct);
    const isCorrect = ua !== null && ua !== undefined && ua === q.correct;

    inner.innerHTML = ''
      + '<div class="result-explain-head">'
      +   '<span class="result-explain-num">Câu ' + (index + 1) + '</span>'
      +   '<span class="result-explain-badge ' + (isCorrect ? 'ok' : 'bad') + '">' + (isCorrect ? 'Đúng' : 'Sai') + '</span>'
      + '</div>'
      + '<div class="result-explain-choices">'
      +   '<span>Bạn chọn: <strong>' + chosenLabel + '</strong></span>'
      +   '<span>Đáp án đúng: <strong>' + correctLabel + '</strong></span>'
      + '</div>'
      + '<div class="result-explain-body">' + buildExplainText(q) + '</div>';

    panel.hidden = false;
    panel.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function goHomeFromAnyPage(){
    examPage.classList.add('page-hidden');
    if(resultPage) resultPage.classList.add('page-hidden');
    homePage.classList.remove('page-hidden');
    hasSubmitted = false;
    stopCountdown();
    if(questionAudio){
      questionAudio.pause();
      questionAudio.removeAttribute('src');
    }
    remainingSeconds = 0;
    updateTimerChip();
    resultBox.classList.remove('show');
    window.scrollTo({top:0,behavior:'smooth'});
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

  function getPartDrawerTitle(partKey, q){
    const pc = partConfig.find(p => p.key === partKey);
    if(pc && !pc.full && pc.section !== 'ALL'){
      return `${pc.section} — ${pc.name}`;
    }
    if(q && q.partLabel) return String(q.partLabel);
    if(partKey && partKey !== 'unknown') return getPartDisplay(partKey);
    return 'Câu hỏi';
  }

  function renderQuestionList(){
    if(!qDrawerMeta || !qDrawerGrid) return;
    const total = activeQuestions.length;
    const answered = userAnswers.filter(a => a !== null && a !== undefined).length;
    const unanswered = total - answered;
    qDrawerMeta.textContent = `Đã làm: ${answered} • Chưa làm: ${unanswered} • Tổng: ${total}`;

    qDrawerGrid.innerHTML = '';
    let lastPart = null;
    let sectionGrid = null;

    for(let i = 0; i < total; i++){
      const q = activeQuestions[i];
      const part = q.part || 'unknown';

      if(part !== lastPart){
        lastPart = part;
        const label = document.createElement('div');
        label.className = 'qdrawer-section-label';
        label.textContent = getPartDrawerTitle(part, q);
        qDrawerGrid.appendChild(label);

        sectionGrid = document.createElement('div');
        sectionGrid.className = 'qdrawer-section-grid';
        qDrawerGrid.appendChild(sectionGrid);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qbtn';
      btn.textContent = String(i + 1);

      const isAnswered = userAnswers[i] !== null && userAnswers[i] !== undefined;
      btn.classList.toggle('is-answered', isAnswered);
      btn.classList.toggle('is-unanswered', !isAnswered);
      btn.classList.toggle('is-current', i === currentQuestionIndex);

      if(hasSubmitted){
        if(isAnswered && userAnswers[i] === q.correct) btn.classList.add('is-correct');
        if(isAnswered && userAnswers[i] !== q.correct) btn.classList.add('is-wrong');
      }

      btn.addEventListener('click', function(){
        currentQuestionIndex = i;
        renderQuestion();
        setQDrawer(false);
      });
      sectionGrid.appendChild(btn);
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

  function getAudioSrcForQuestion(q){
    if(!q) return '';
    if(currentSeries !== 'ets2024') return '';
    if(!/^part[1-4]$/i.test(q.part || '')) return '';
    const id = Number(q.id);
    if(!Number.isFinite(id)) return '';

    const base = 'drive-download-20260414T040048Z-3-001';
    if(id >= 1 && id <= 31){
      return encodeURI(base + '/2024-Test_1-' + id + '.mp3');
    }
    if(id >= 32 && id <= 46){
      const start = 32 + Math.floor((id - 32) / 3) * 3;
      const end = start + 2;
      return encodeURI(base + '/part 3/2024-Test_1-' + start + '-' + end + '.mp3');
    }
    return '';
  }

  function getListeningImageFallback(q){
    if(!q) return '';
    if(currentSeries !== 'ets2024') return '';
    if(!/^part[1-4]$/i.test(q.part || '')) return '';
    const id = Number(q.id);
    if(!Number.isFinite(id)) return '';

    if(id >= 1 && id <= 6) return 'img/Picture' + id + '.png';
    if(id >= 62 && id <= 64) return 'img/Picture7.png';
    if(id >= 65 && id <= 67) return 'img/Picture8.png';
    if(id >= 68 && id <= 70) return 'img/Picture9.png';
    if(id >= 95 && id <= 97) return 'img/Picture10.png';
    if(id >= 98 && id <= 100) return 'img/Picture11.png';
    return '';
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
    const imageSrc = q.image || getListeningImageFallback(q);
    if(imageSrc){
      questionImage.src = imageSrc;
      imgWrap.classList.remove('is-hidden');
    }else{
      questionImage.removeAttribute('src');
      imgWrap.classList.add('is-hidden');
    }

    const audioWrap = questionAudio ? questionAudio.closest('.audio-wrap') : null;
    const audioSrc = getAudioSrcForQuestion(q);
    if(questionAudio && audioWrap){
      if(audioSrc){
        if(questionAudio.getAttribute('src') !== audioSrc){
          questionAudio.pause();
          questionAudio.setAttribute('src', audioSrc);
          questionAudio.load();
        }
        audioWrap.classList.remove('is-hidden');
      }else{
        questionAudio.pause();
        questionAudio.removeAttribute('src');
        audioWrap.classList.add('is-hidden');
      }
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
    activeQuestions.forEach((q, index) => {
      if(userAnswers[index] === q.correct) correct++;
    });

    renderQuestion();
    const summary = 'Số câu đúng: ' + correct + ' / ' + activeQuestions.length
      + (currentMode === 'practice' ? ' • Chế độ luyện tập' : '')
      + (correct === activeQuestions.length && activeQuestions.length > 0 ? ' • Chúc mừng, bạn làm đúng hết!' : '');
    showResultPage(summary);
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

  backHomeBtn.addEventListener('click', goHomeFromAnyPage);
  if(resultBackHomeBtn) resultBackHomeBtn.addEventListener('click', goHomeFromAnyPage);
  if(reviewAnswersBtn){
    reviewAnswersBtn.addEventListener('click', function(){
      if(resultPage) resultPage.classList.add('page-hidden');
      examPage.classList.remove('page-hidden');
      renderQuestion();
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }
  if(resultPage){
    resultPage.addEventListener('click', function(e){
      const cell = e.target.closest('.result-qcell');
      if(!cell) return;
      const i = Number(cell.getAttribute('data-q'));
      if(!Number.isFinite(i)) return;
      openResultExplain(i);
    });
  }

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
