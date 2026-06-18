/**
 * FISB Musici Live Evaluator - Core Logic (Rev. 33/2025)
 */

document.addEventListener('DOMContentLoaded', () => {
    // STATE VARIABLES
    let sessionActive = false;
    let groupName = '';
    let phaseNote = '';
    let role = 'tamburi'; // tamburi, chiarine, coreografia, supervisore
    let isNaturalChiarine = false;
    
    // Timer Variables
    let timerInterval = null;
    let totalTimeMs = 0; // in milliseconds
    let timerRunning = false;
    
    // Brano (Tune) Timer Variables
    let tuneStartTime = null;
    let tuneRunning = false;
    let tuneInterval = null;
    let activeTuneIdForEdit = null;

    // Data lists
    let tunes = []; // logged tunes
    let penalties = []; // execution penalties stack for undo
    
    // Coreografia Counter Points
    let choreoCounters = {
        pres: 0,     // Presentazione (max 2)
        insBase: 0,  // Insieme Base (max 4)
        insComp: 0,  // Insieme Composta (max 3)
        estParz: 0,  // Esterna Parziale (no limit)
        estBase: 0,  // Esterna Base (no limit)
        estComp: 0,  // Esterna Composta (no limit)
        cong: 0,     // Congedo (max 1)
        sinc: 0,     // Sincronismo (max 12)
        portamento: 0.0 // Portamento value
    };
    
    // General penalties
    let inspectorPenalties = 0.0;
    
    // Combined / Supervisore values
    let supervisoreScores = {
        tamburi: 10.0,
        chiarine: 10.0,
        coreografia: 10.0
    };

    // DOM ELEMENTS
    const appContainer = document.getElementById('app-container');
    const viewSetup = document.getElementById('view-setup');
    const viewTunes = document.getElementById('view-tunes');
    const viewExecution = document.getElementById('view-execution');
    const viewChoreography = document.getElementById('view-choreography');
    const viewResults = document.getElementById('view-results');
    
    const navSetup = document.getElementById('nav-setup');
    const navTunes = document.getElementById('nav-tunes');
    const navExecution = document.getElementById('nav-execution');
    const navChoreography = document.getElementById('nav-choreography');
    const navResults = document.getElementById('nav-results');
    const navItems = [navSetup, navTunes, navExecution, navChoreography, navResults];
    
    const setupForm = document.getElementById('setup-form');
    const inputGroupName = document.getElementById('input-group-name');
    const inputPhase = document.getElementById('input-phase');
    const selectRole = document.getElementById('select-role');
    const checkNaturalChiarine = document.getElementById('check-natural-chiarine');
    const naturalChiarineContainer = document.getElementById('natural-chiarine-container');
    const btnStartSession = document.getElementById('btn-start-session');
    
    const activeGroupBadge = document.getElementById('active-group-badge');
    const badgeGroupName = document.getElementById('badge-group-name');
    const badgeRole = document.getElementById('badge-role');
    
    // Timer DOM
    const globalTimerBar = document.getElementById('global-timer-bar');
    const timerDisplay = document.getElementById('timer-display');
    const timerStatusBadge = document.getElementById('timer-status-badge');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerReset = document.getElementById('btn-timer-reset');
    
    // Tune DOM
    const btnTuneTrigger = document.getElementById('btn-tune-trigger');
    const btnTuneText = document.getElementById('btn-tune-text');
    const currentTuneRunningDisplay = document.getElementById('current-tune-running-display');
    const runningTuneTime = document.getElementById('running-tune-time');
    const tunesList = document.getElementById('tunes-list');
    const btnAddManualTune = document.getElementById('btn-add-manual-tune');
    const tuneLimitsBadge = document.getElementById('tune-limits-badge');
    const difficultyRawPointsDisplay = document.getElementById('difficulty-raw-points');
    
    // Modal DOM
    const modalManualTune = document.getElementById('modal-manual-tune');
    const inputManualDuration = document.getElementById('input-manual-duration');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalSave = document.getElementById('btn-modal-save');
    
    // Execution DOM
    const executionLiveScore = document.getElementById('execution-live-score');
    const btnUndoPenalty = document.getElementById('btn-undo-penalty');
    const btnPenaltyExtra = document.getElementById('btn-penalty-extra');
    const extraBtnLabel = document.getElementById('extra-btn-label');
    const extraBtnSubtext = document.getElementById('extra-btn-subtext');
    const countLDisplay = document.getElementById('count-l-display');
    const countMDisplay = document.getElementById('count-m-display');
    const countGDisplay = document.getElementById('count-g-display');
    const countXDisplay = document.getElementById('count-x-display');
    
    // Choreography DOM
    const selectPortamento = document.getElementById('select-portamento');
    const choreoRawTotalDisplay = document.getElementById('choreo-raw-total');
    const choreoScaledTotalDisplay = document.getElementById('choreo-scaled-total');
    
    // Results DOM
    const resGroupName = document.getElementById('res-group-name');
    const resPhaseNote = document.getElementById('res-phase-note');
    const resRoleBadge = document.getElementById('res-role-badge');
    const resValDiff = document.getElementById('res-val-diff');
    const resRowAddendum = document.getElementById('res-row-addendum');
    const resValAddendum = document.getElementById('res-val-addendum');
    const resValPort = document.getElementById('res-val-port');
    const resValExecBase = document.getElementById('res-val-exec-base');
    const resValExecPenalties = document.getElementById('res-val-exec-penalties');
    const resValTimePenalty = document.getElementById('res-val-time-penalty');
    const resValTotalScore = document.getElementById('res-val-total-score');
    const resTotalTime = document.getElementById('res-total-time');
    const inputInspectorPenalties = document.getElementById('input-inspector-penalties');
    const resRowInspectorPenalties = document.getElementById('res-row-inspector-penalties');
    
    // Supervisore Elements
    const resRowSupervisoreInputs = document.getElementById('res-row-supervisore-inputs');
    const resRowDifficultyDisplay = document.getElementById('res-row-difficulty-display');
    const inputTamburiScore = document.getElementById('input-tamburi-score');
    const inputChiarineScore = document.getElementById('input-chiarine-score');
    const inputCoreoScore = document.getElementById('input-coreo-score');
    
    const btnCopyReport = document.getElementById('btn-copy-report');
    const btnSaveSession = document.getElementById('btn-save-session');
    const btnDiscardSession = document.getElementById('btn-discard-session');
    const recentSessionsList = document.getElementById('recent-sessions-list');
    const fullHistoryList = document.getElementById('full-history-list');
    const btnClearHistory = document.getElementById('btn-clear-history');

    // INITIALIZATION
    loadHistory();
    setupEventListeners();

    // SETUP EVENT LISTENERS
    function setupEventListeners() {
        // Toggle natural chiarine option based on role selection
        selectRole.addEventListener('change', () => {
            const selected = selectRole.value;
            if (selected === 'chiarine' || selected === 'supervisore') {
                naturalChiarineContainer.classList.remove('hidden');
            } else {
                naturalChiarineContainer.classList.add('hidden');
            }
        });

        // Start Session
        btnStartSession.addEventListener('click', startEvaluationSession);

        // Timer Event Listeners
        btnTimerToggle.addEventListener('click', toggleTotalTimer);
        btnTimerReset.addEventListener('click', resetTotalTimer);

        // Tune triggers
        btnTuneTrigger.addEventListener('click', handleTuneTrigger);
        btnAddManualTune.addEventListener('click', () => showModal(true));
        btnModalCancel.addEventListener('click', () => showModal(false));
        btnModalSave.addEventListener('click', saveManualTune);

        // Penalty triggers
        document.querySelectorAll('.btn-penalty').forEach(btn => {
            btn.addEventListener('click', () => {
                const severity = btn.getAttribute('data-severity');
                addPenalty(severity);
                // Simple click visual feedback ripple
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = '', 100);
            });
        });

        // Undo penalty
        btnUndoPenalty.addEventListener('click', undoLastPenalty);

        // Choreo Counter triggers
        document.querySelectorAll('.btn-counter').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                const isPlus = btn.classList.contains('btn-plus');
                updateChoreoCounter(target, isPlus);
            });
        });

        selectPortamento.addEventListener('change', () => {
            choreoCounters.portamento = parseFloat(selectPortamento.value);
            updateChoreoScore();
        });

        // Results triggers
        inputInspectorPenalties.addEventListener('input', () => {
            inspectorPenalties = Math.max(0, parseFloat(inputInspectorPenalties.value) || 0);
            updateFinalResults();
        });

        // Supervisore Live Inputs triggers
        inputTamburiScore.addEventListener('input', () => {
            supervisoreScores.tamburi = Math.min(10, Math.max(0, parseFloat(inputTamburiScore.value) || 0));
            updateFinalResults();
        });
        inputChiarineScore.addEventListener('input', () => {
            supervisoreScores.chiarine = Math.min(10, Math.max(0, parseFloat(inputChiarineScore.value) || 0));
            updateFinalResults();
        });
        inputCoreoScore.addEventListener('input', () => {
            supervisoreScores.coreografia = Math.min(10, Math.max(0, parseFloat(inputCoreoScore.value) || 0));
            updateFinalResults();
        });

        btnCopyReport.addEventListener('click', copyFormattedReport);
        btnSaveSession.addEventListener('click', saveSessionToStorage);
        btnDiscardSession.addEventListener('click', discardCurrentSession);
        btnClearHistory.addEventListener('click', clearAllHistory);

        // Navigation (SPA views switcher)
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('disabled')) return;
                const viewId = item.getAttribute('data-view');
                switchView(viewId);
            });
        });
    }

    // SPA SWITCH VIEWS
    function switchView(viewId) {
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active');
            view.classList.add('hidden');
        });
        
        const targetView = document.getElementById(viewId);
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
        
        navItems.forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update active group badge state
        if (viewId === 'view-setup') {
            activeGroupBadge.classList.add('hidden');
            globalTimerBar.classList.add('hidden');
            appContainer.className = 'dashboard-active';
        } else {
            activeGroupBadge.classList.remove('hidden');
            globalTimerBar.classList.remove('hidden');
            appContainer.className = `theme-${role}`;
            
            // If viewing results, update them
            if (viewId === 'view-results') {
                updateFinalResults();
            }
        }
    }

    // START VALUTAZIONE LIVE
    function startEvaluationSession() {
        groupName = inputGroupName.value.trim();
        phaseNote = inputPhase.value.trim() || 'Gara';
        role = selectRole.value;
        isNaturalChiarine = checkNaturalChiarine.checked && (role === 'chiarine' || role === 'supervisore');
        
        if (!groupName) {
            alert('Inserisci il nome del gruppo per continuare.');
            return;
        }

        // Init states
        sessionActive = true;
        totalTimeMs = 0;
        timerRunning = false;
        tunes = [];
        penalties = [];
        inspectorPenalties = 0.0;
        inputInspectorPenalties.value = "0.0";
        
        choreoCounters = {
            pres: 0, insBase: 0, insComp: 0, estParz: 0, estBase: 0, estComp: 0, cong: 0, sinc: 0, portamento: 0.0
        };
        selectPortamento.value = "0.0";
        
        // Reset counts displays
        countLDisplay.textContent = '0';
        countMDisplay.textContent = '0';
        countGDisplay.textContent = '0';
        countXDisplay.textContent = '0';
        
        // Reset timers
        updateTimerDisplay();
        btnTimerToggle.className = 'btn-timer btn-timer-start';
        btnTimerToggle.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M8 5v14l11-7z"/></svg>';
        timerStatusBadge.textContent = 'PRONTO';
        timerStatusBadge.style.backgroundColor = 'rgba(255,255,255,0.08)';
        
        btnTuneTrigger.disabled = true;
        btnTuneTrigger.className = 'btn btn-tune btn-inactive btn-block ripple-effect';
        btnTuneText.textContent = 'Avvia Brano';
        currentTuneRunningDisplay.classList.add('hidden');
        
        // Set up role-specific displays
        configureRoleSpecificUI();

        // Enable navigation items
        enableNavigation();

        // Switch to tunes view or execution depending on role
        if (role === 'coreografia') {
            switchView('view-choreography');
        } else {
            switchView('view-tunes');
        }
        
        // Set badge details
        badgeGroupName.textContent = groupName;
        let roleLabel = 'Tamburi';
        if (role === 'chiarine') roleLabel = 'Chiarine';
        if (role === 'coreografia') roleLabel = 'Coreo Musici';
        if (role === 'supervisore') roleLabel = 'Supervisore';
        badgeRole.textContent = roleLabel;
    }

    function configureRoleSpecificUI() {
        // Accents and buttons configurations
        if (role === 'tamburi') {
            extraBtnLabel.textContent = 'GRAVISSIMA (S)';
            extraBtnSubtext.textContent = '-0.90';
            tuneLimitsBadge.textContent = 'Max 1 AA | Max 3 A | Limite 1550 pt';
            difficultyRawPointsDisplay.textContent = '0 / 1550';
            resRowSupervisoreInputs.classList.add('hidden');
            resRowDifficultyDisplay.classList.remove('hidden');
        } else if (role === 'chiarine') {
            extraBtnLabel.textContent = 'GRAVISSIMA (S)';
            extraBtnSubtext.textContent = '-0.90';
            tuneLimitsBadge.textContent = 'Max 1 AA | Max 3 A | Limite 1600 pt';
            difficultyRawPointsDisplay.textContent = '0 / 1600';
            resRowSupervisoreInputs.classList.add('hidden');
            resRowDifficultyDisplay.classList.remove('hidden');
        } else if (role === 'coreografia') {
            extraBtnLabel.textContent = 'SPECIALE (S)';
            extraBtnSubtext.textContent = '-2.50';
            resRowSupervisoreInputs.classList.add('hidden');
            resRowDifficultyDisplay.classList.remove('hidden');
        } else { // supervisore
            extraBtnLabel.textContent = 'SPECIALE (S)';
            extraBtnSubtext.textContent = '-2.50';
            resRowSupervisoreInputs.classList.remove('hidden');
            resRowDifficultyDisplay.classList.add('hidden');
            
            // Set input defaults
            inputTamburiScore.value = "10.0";
            inputChiarineScore.value = "10.0";
            inputCoreoScore.value = "10.0";
            supervisoreScores.tamburi = 10.0;
            supervisoreScores.chiarine = 10.0;
            supervisoreScores.coreografia = 10.0;
        }

        // Adjust results inspector row
        if (role === 'supervisore') {
            resRowInspectorPenalties.classList.remove('hidden');
        } else {
            resRowInspectorPenalties.classList.add('hidden'); // Calculated automatically
        }
    }

    function enableNavigation() {
        navItems.forEach(item => item.classList.remove('disabled'));
        
        // Hide/Show tabs based on role
        if (role === 'coreografia') {
            navTunes.classList.add('hidden');
            navChoreography.classList.remove('hidden');
        } else if (role === 'supervisore') {
            navTunes.classList.remove('hidden');
            navChoreography.classList.remove('hidden');
        } else { // tamburi, chiarine
            navTunes.classList.remove('hidden');
            navChoreography.classList.add('hidden');
        }
    }

    // TOTAL STOPWATCH TIMER FUNCTIONS
    function toggleTotalTimer() {
        if (timerRunning) {
            // Pause
            clearInterval(timerInterval);
            timerRunning = false;
            btnTimerToggle.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M8 5v14l11-7z"/></svg>';
            btnTimerToggle.className = 'btn-timer btn-timer-start';
            timerStatusBadge.textContent = 'PAUSA';
            timerStatusBadge.style.backgroundColor = 'var(--color-warning)';
            
            // Also stop tune if running
            if (tuneRunning) {
                stopTuneRecording();
            }
            btnTuneTrigger.disabled = true;
        } else {
            // Start
            const startTime = Date.now() - totalTimeMs;
            timerInterval = setInterval(() => {
                totalTimeMs = Date.now() - startTime;
                updateTimerDisplay();
            }, 100);
            
            timerRunning = true;
            btnTimerToggle.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M12 19c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1s1 .45 1 1v12c0 .55-.45 1-1 1zm-4 0c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1s1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>';
            btnTimerToggle.className = 'btn-timer btn-timer-start paused';
            timerStatusBadge.textContent = 'IN GARA';
            timerStatusBadge.style.backgroundColor = 'var(--color-success)';
            
            // Enable tune button
            btnTuneTrigger.disabled = false;
            updateTuneBtnStyle();
        }
    }

    function resetTotalTimer() {
        if (confirm('Vuoi resettare il cronometro principale? Questo non cancellerà i brani registrati.')) {
            clearInterval(timerInterval);
            timerRunning = false;
            totalTimeMs = 0;
            updateTimerDisplay();
            
            btnTimerToggle.className = 'btn-timer btn-timer-start';
            btnTimerToggle.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M8 5v14l11-7z"/></svg>';
            timerStatusBadge.textContent = 'PRONTO';
            timerStatusBadge.style.backgroundColor = 'rgba(255,255,255,0.08)';
            
            if (tuneRunning) {
                stopTuneRecording();
            }
            btnTuneTrigger.disabled = true;
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(totalTimeMs / 60000);
        const seconds = Math.floor((totalTimeMs % 60000) / 1000);
        const tenths = Math.floor((totalTimeMs % 1000) / 100);
        
        const padM = String(minutes).padStart(2, '0');
        const padS = String(seconds).padStart(2, '0');
        
        timerDisplay.textContent = `${padM}:${padS}.${tenths}`;
        
        // Color alert if close to or over limit (6'10" is 370s)
        const totalSeconds = totalTimeMs / 1000;
        if (totalSeconds > 370) {
            timerDisplay.style.color = 'var(--color-danger)';
            timerStatusBadge.textContent = 'FUORI TEMPO';
            timerStatusBadge.style.backgroundColor = 'var(--color-danger)';
        } else if (totalSeconds > 340) {
            timerDisplay.style.color = 'var(--color-warning)';
        } else {
            timerDisplay.style.color = '';
        }
    }

    // TUNE STOPWATCH LIVE RECORDING
    function handleTuneTrigger() {
        if (!timerRunning) return;
        
        if (tuneRunning) {
            // STOP TUNE
            stopTuneRecording();
        } else {
            // START TUNE
            tuneStartTime = Date.now();
            tuneRunning = true;
            currentTuneRunningDisplay.classList.remove('hidden');
            
            tuneInterval = setInterval(() => {
                const elapsed = ((Date.now() - tuneStartTime) / 1000).toFixed(1);
                runningTuneTime.textContent = `${elapsed}s`;
            }, 100);
            
            updateTuneBtnStyle();
        }
    }

    function stopTuneRecording() {
        clearInterval(tuneInterval);
        tuneRunning = false;
        
        const duration = parseFloat(((Date.now() - tuneStartTime) / 1000).toFixed(2));
        tuneStartTime = null;
        currentTuneRunningDisplay.classList.add('hidden');
        
        updateTuneBtnStyle();
        
        if (duration < 1.0) {
            alert('Il brano registrato è troppo breve (< 1s). Valutazione annullata.');
            return;
        }
        
        // Add new tune automatically
        addNewTune(duration);
    }

    function updateTuneBtnStyle() {
        if (tuneRunning) {
            btnTuneTrigger.className = 'btn btn-tune btn-active-run btn-block ripple-effect';
            btnTuneText.textContent = 'Fermo Brano';
        } else {
            if (timerRunning) {
                btnTuneTrigger.className = 'btn btn-tune btn-primary btn-block ripple-effect';
                btnTuneTrigger.disabled = false;
            } else {
                btnTuneTrigger.className = 'btn btn-tune btn-inactive btn-block ripple-effect';
                btnTuneTrigger.disabled = true;
            }
            btnTuneText.textContent = 'Avvia Brano';
        }
    }

    // TUNE CONVERSION & SCORING LOGIC
    function getTuneClass(duration) {
        // D (< 9s), C (9.00s - 15.49s), B (15.50s - 21.49s), A (21.50s - 27.99s), AA (>= 28s)
        if (duration < 9.0) return 'D';
        if (duration < 15.5) return 'C';
        if (duration < 21.5) return 'B';
        if (duration < 28.0) return 'A';
        return 'AA';
    }

    function getBasePoints(meritClass, voices) {
        // base values depending on class and voices
        const voiceIndex = Math.min(voices, 3) - 1; // 0 for 1 voice, 1 for 2, 2 for 3+
        
        const scores = {
            'D': [1, 6, 15],
            'C': [4, 15, 40],
            'B': [10, 40, 60],
            'A': [25, 60, 80],
            'AA': [45, 80, 100]
        };
        
        return scores[meritClass] ? scores[meritClass][voiceIndex] : 0;
    }

    function addNewTune(duration) {
        const tuneClass = getTuneClass(duration);
        const newTune = {
            id: Date.now(),
            duration: duration,
            voices: 1, // default 1 voice
            difficulties: [],
            declassifications: []
        };
        
        tunes.push(newTune);
        renderTunesList();
        updateDifficultyScores();
    }

    function saveManualTune() {
        const duration = parseFloat(inputManualDuration.value);
        if (isNaN(duration) || duration <= 0) {
            alert('Inserisci una durata valida.');
            return;
        }
        
        addNewTune(duration);
        showModal(false);
        inputManualDuration.value = '';
    }

    function deleteTune(tuneId) {
        tunes = tunes.filter(t => t.id !== tuneId);
        renderTunesList();
        updateDifficultyScores();
    }

    function updateTuneVoices(tuneId, voicesVal) {
        const tune = tunes.find(t => t.id === tuneId);
        if (tune) {
            tune.voices = parseInt(voicesVal);
            renderTunesList();
            updateDifficultyScores();
        }
    }

    function toggleTuneDifficulty(tuneId, diffType) {
        const tune = tunes.find(t => t.id === tuneId);
        if (tune) {
            const index = tune.difficulties.indexOf(diffType);
            if (index > -1) {
                tune.difficulties.splice(index, 1);
            } else {
                // Max 2 difficulties per brano
                if (tune.difficulties.length >= 2) {
                    alert('Il regolamento consente al massimo 2 difficoltà aggiuntive per brano.');
                    return;
                }
                tune.difficulties.push(diffType);
            }
            renderTunesList();
            updateDifficultyScores();
        }
    }

    function toggleTuneDeclass(tuneId, declType) {
        const tune = tunes.find(t => t.id === tuneId);
        if (tune) {
            const index = tune.declassifications.indexOf(declType);
            if (index > -1) {
                tune.declassifications.splice(index, 1);
            } else {
                tune.declassifications.push(declType);
            }
            renderTunesList();
            updateDifficultyScores();
        }
    }

    // TUNE WATERFALL DEMOTION ALGORITHM (Max 1 AA, Max 3 A)
    function applyTuneWaterfallDemotions(tunesArray) {
        // Create copies of tunes to avoid mutating raw logs
        let processed = tunesArray.map(t => {
            return {
                ...t,
                originalClass: getTuneClass(t.duration),
                effectiveClass: getTuneClass(t.duration)
            };
        });

        // We sort the processed tunes by original base points descending (to preserve the highest value ones in upper classes)
        // If same base points, sort by duration descending
        processed.sort((x, y) => {
            const valX = getBasePoints(x.originalClass, x.voices);
            const valY = getBasePoints(y.originalClass, y.voices);
            if (valX !== valY) return valY - valX;
            return y.duration - x.duration;
        });

        let aaCount = 0;
        let aCount = 0;

        // Pass 1: Demote excess AA to A
        processed.forEach(t => {
            if (t.originalClass === 'AA') {
                aaCount++;
                if (aaCount > 1) {
                    t.effectiveClass = 'A';
                }
            }
        });

        // Pass 2: Demote excess A to B
        processed.forEach(t => {
            // A tune is A if it was originally A, OR if it was AA and got demoted to A
            if (t.originalClass === 'A' || (t.originalClass === 'AA' && t.effectiveClass === 'A')) {
                aCount++;
                if (aCount > 3) {
                    t.effectiveClass = 'B';
                }
            }
        });

        return processed;
    }

    // CALCULATE DIFFICULTY POINTS (Raw & Scaled)
    function calculateDifficulty() {
        if (tunes.length === 0) return { raw: 0, scaled: 0.0, tunesData: [] };

        // Apply demotions
        const processedTunes = applyTuneWaterfallDemotions(tunes);
        let totalRawPoints = 0;

        processedTunes.forEach(t => {
            const base = getBasePoints(t.effectiveClass, t.voices);
            
            // Calculate difficulty percentage
            let diffPercentage = 0.0;
            t.difficulties.forEach(d => {
                // accelerando/inginocchiamento/dinamica = 10% (wait, tamburi dynamic/accel is 10%, ginocchio/accessori is 20%, separazione is 40%, controtempi is 80%)
                // let's apply the correct role-based values
                if (role === 'tamburi') {
                    if (d === 'accel' || d === 'dinamica') diffPercentage += 0.10;
                    else if (d === 'ginocchio' || d === 'accessori') diffPercentage += 0.20;
                    else if (d === 'separazione') diffPercentage += 0.40;
                    else if (d === 'controtempi') diffPercentage += 0.80;
                } else { // chiarine
                    if (d === 'accel' || d === 'ginocchio') diffPercentage += 0.10;
                    else if (d === 'dinamica') diffPercentage += 0.20;
                    else if (d === 'separazione') diffPercentage += 0.40;
                    else if (d === 'polifoniche') diffPercentage += 0.80;
                }
            });

            // Base + percentage
            let tuneRaw = base * (1 + diffPercentage);
            
            // Apply declassifications (-10 points each)
            const declPoints = t.declassifications.length * 10;
            tuneRaw = Math.max(0, tuneRaw - declPoints);

            t.rawScore = parseFloat(tuneRaw.toFixed(2));
            totalRawPoints += t.rawScore;
        });

        // Cap at role limit
        const limit = role === 'tamburi' ? 1550 : 1600;
        const cappedRawPoints = Math.min(limit, totalRawPoints);
        
        // Scale to 10.0
        let scaledScore = (cappedRawPoints / limit) * 10.0;
        
        // Round to 2 decimal places
        scaledScore = parseFloat(scaledScore.toFixed(2));

        return {
            raw: parseFloat(totalRawPoints.toFixed(2)),
            scaled: scaledScore,
            tunesData: processedTunes
        };
    }

    function updateDifficultyScores() {
        const calc = calculateDifficulty();
        const limit = role === 'tamburi' ? 1550 : 1600;
        
        difficultyRawPointsDisplay.textContent = `${calc.raw} / ${limit}`;
        
        // Color code if capped
        if (calc.raw >= limit) {
            difficultyRawPointsDisplay.style.color = 'var(--color-success)';
        } else {
            difficultyRawPointsDisplay.style.color = '';
        }
    }

    // RENDER TUNES LIST IN VIEW
    function renderTunesList() {
        tunesList.innerHTML = '';
        
        if (tunes.length === 0) {
            tunesList.innerHTML = '<p class="empty-state">Nessun brano registrato. Avvia un brano durante l\'esercizio o inseriscilo manualmente.</p>';
            return;
        }

        // Apply waterfall demotion to display accurate classes
        const processed = applyTuneWaterfallDemotions(tunes);

        processed.forEach(t => {
            const base = getBasePoints(t.effectiveClass, t.voices);
            const isDemoted = t.originalClass !== t.effectiveClass;
            
            // Build tune item
            const div = document.createElement('div');
            div.className = 'tune-item';
            
            // Accents
            let diffOptions = '';
            if (role === 'tamburi') {
                diffOptions = `
                    <button class="tag-btn diff-tag ${t.difficulties.includes('accel') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'accel')">Accel/Rall (+10%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('dinamica') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'dinamica')">Dinamica (+10%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('ginocchio') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'ginocchio')">In Ginocchio (+20%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('accessori') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'accessori')">Accessori (+20%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('separazione') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'separazione')">Separazione (+40%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('controtempi') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'controtempi')">Controtempi (+80%)</button>
                `;
            } else { // Chiarine or Supervisore
                diffOptions = `
                    <button class="tag-btn diff-tag ${t.difficulties.includes('accel') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'accel')">Accel/Rall (+10%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('ginocchio') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'ginocchio')">In Ginocchio (+10%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('dinamica') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'dinamica')">Dinamica (+20%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('separazione') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'separazione')">Separazione (+40%)</button>
                    <button class="tag-btn diff-tag ${t.difficulties.includes('polifoniche') ? 'active' : ''}" onclick="window.app.toggleTuneDifficulty(${t.id}, 'polifoniche')">Polifonia (+80%)</button>
                `;
            }

            const declOptions = `
                <button class="tag-btn decl-tag ${t.declassifications.includes('ritmo') ? 'active' : ''}" onclick="window.app.toggleTuneDeclass(${t.id}, 'ritmo')">Ritmo/Melodia</button>
                <button class="tag-btn decl-tag ${t.declassifications.includes('estensione') ? 'active' : ''}" onclick="window.app.toggleTuneDeclass(${t.id}, 'estensione')">Estensione</button>
                <button class="tag-btn decl-tag ${t.declassifications.includes('interruzioni') ? 'active' : ''}" onclick="window.app.toggleTuneDeclass(${t.id}, 'interruzioni')">Interruzioni</button>
                <button class="tag-btn decl-tag ${t.declassifications.includes('simile') ? 'active' : ''}" onclick="window.app.toggleTuneDeclass(${t.id}, 'simile')">Simile</button>
                <button class="tag-btn decl-tag ${t.declassifications.includes('ostinata') ? 'active' : ''}" onclick="window.app.toggleTuneDeclass(${t.id}, 'ostinata')">Ostinato/Fraseggio</button>
                <button class="tag-btn decl-tag ${t.declassifications.includes('offuscato') ? 'active' : ''}" onclick="window.app.toggleTuneDeclass(${t.id}, 'offuscato')">Offuscato</button>
            `;

            div.innerHTML = `
                <div class="tune-item-header">
                    <div class="tune-badge-container">
                        <span class="tune-class-badge" style="${isDemoted ? 'background-color:var(--color-warning)' : ''}">
                            Classe ${t.effectiveClass} ${isDemoted ? `<small style="font-weight:normal;opacity:0.8">(declassato da ${t.originalClass})</small>` : ''}
                        </span>
                        <span class="tune-duration-badge">Durata: ${t.duration}s</span>
                    </div>
                    <div class="tune-points-badge mono">
                        ${t.rawScore} pt
                    </div>
                </div>
                
                <div class="tune-item-controls">
                    <select class="tune-voice-select" onchange="window.app.updateTuneVoices(${t.id}, this.value)">
                        <option value="1" ${t.voices === 1 ? 'selected' : ''}>1 Voce (Unisono)</option>
                        <option value="2" ${t.voices === 2 ? 'selected' : ''}>2 Voci</option>
                        <option value="3" ${t.voices === 3 ? 'selected' : ''}>3+ Voci</option>
                    </select>
                    
                    <button class="btn-delete-tune" onclick="window.app.deleteTune(${t.id})">Rimuovi</button>
                </div>
                
                <div class="tune-item-controls" style="margin-top:4px; border:none; padding-top:0;">
                    <span style="font-size:0.7rem; color:var(--text-secondary); width:100%; display:block; margin:2px 0;">Difficoltà (max 2):</span>
                    ${diffOptions}
                </div>

                <div class="tune-item-controls" style="margin-top:4px; border:none; padding-top:0;">
                    <span style="font-size:0.7rem; color:var(--text-secondary); width:100%; display:block; margin:2px 0;">Declassamenti (-10pt):</span>
                    ${declOptions}
                </div>
            `;
            
            tunesList.appendChild(div);
        });
    }

    // PENALTY LIVE RECORDING & UNDO STACK
    function addPenalty(severity) {
        if (!sessionActive) return;
        
        penalties.push(severity);
        updateExecutionScore();
        btnUndoPenalty.disabled = false;
        
        // Haptic feel vibration if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    function undoLastPenalty() {
        if (penalties.length > 0) {
            penalties.pop();
            updateExecutionScore();
        }
        
        if (penalties.length === 0) {
            btnUndoPenalty.disabled = true;
        }
    }

    function updateExecutionScore() {
        let score = 10.0;
        
        let lieveCount = 0;
        let mediaCount = 0;
        let graveCount = 0;
        let extraCount = 0;
        
        penalties.forEach(p => {
            if (p === 'lieve') {
                lieveCount++;
                score -= 0.10;
            } else if (p === 'media') {
                mediaCount++;
                score -= 0.30;
            } else if (p === 'grave') {
                graveCount++;
                score -= 0.60;
            } else if (p === 'extra') {
                extraCount++;
                if (role === 'coreografia' || role === 'supervisore') {
                    score -= 2.50; // Speciale
                } else {
                    score -= 0.90; // Gravissima
                }
            }
        });
        
        score = Math.max(0, score);
        executionLiveScore.textContent = score.toFixed(2);
        
        countLDisplay.textContent = lieveCount;
        countMDisplay.textContent = mediaCount;
        countGDisplay.textContent = graveCount;
        countXDisplay.textContent = extraCount;
    }

    // COREOGRAFIA COUNTERS LOGIC
    function updateChoreoCounter(field, isPlus) {
        if (!sessionActive) return;

        // Apply constraints
        if (field === 'pres') {
            choreoCounters.pres = isPlus ? Math.min(2, choreoCounters.pres + 1) : Math.max(0, choreoCounters.pres - 1);
            document.getElementById('choreo-pres-counter').textContent = choreoCounters.pres;
            document.getElementById('choreo-pres-val').textContent = choreoCounters.pres * 10;
        } else if (field === 'insBase') {
            choreoCounters.insBase = isPlus ? Math.min(4, choreoCounters.insBase + 1) : Math.max(0, choreoCounters.insBase - 1);
            document.getElementById('choreo-ins-base-counter').textContent = choreoCounters.insBase;
            updateInsiemeVal();
        } else if (field === 'insComp') {
            choreoCounters.insComp = isPlus ? Math.min(3, choreoCounters.insComp + 1) : Math.max(0, choreoCounters.insComp - 1);
            document.getElementById('choreo-ins-comp-counter').textContent = choreoCounters.insComp;
            updateInsiemeVal();
        } else if (field === 'estParz') {
            choreoCounters.estParz = isPlus ? choreoCounters.estParz + 1 : Math.max(0, choreoCounters.estParz - 1);
            document.getElementById('choreo-est-parz-counter').textContent = choreoCounters.estParz;
            document.getElementById('choreo-est-parz-val').textContent = choreoCounters.estParz * 1;
            updateEsterneVal();
        } else if (field === 'estBase') {
            choreoCounters.estBase = isPlus ? choreoCounters.estBase + 1 : Math.max(0, choreoCounters.estBase - 1);
            document.getElementById('choreo-est-base-counter').textContent = choreoCounters.estBase;
            document.getElementById('choreo-est-base-val').textContent = choreoCounters.estBase * 3;
            updateEsterneVal();
        } else if (field === 'estComp') {
            choreoCounters.estComp = isPlus ? choreoCounters.estComp + 1 : Math.max(0, choreoCounters.estComp - 1);
            document.getElementById('choreo-est-comp-counter').textContent = choreoCounters.estComp;
            document.getElementById('choreo-est-comp-val').textContent = choreoCounters.estComp * 5;
            updateEsterneVal();
        } else if (field === 'cong') {
            choreoCounters.cong = isPlus ? Math.min(1, choreoCounters.cong + 1) : Math.max(0, choreoCounters.cong - 1);
            document.getElementById('choreo-cong-counter').textContent = choreoCounters.cong;
            document.getElementById('choreo-cong-val').textContent = choreoCounters.cong * 5;
        } else if (field === 'sinc') {
            choreoCounters.sinc = isPlus ? Math.min(12, choreoCounters.sinc + 1) : Math.max(0, choreoCounters.sinc - 1);
            document.getElementById('choreo-sinc-counter').textContent = choreoCounters.sinc;
            document.getElementById('choreo-sinc-val').textContent = choreoCounters.sinc * 1;
        }
        
        updateChoreoScore();
    }

    function updateInsiemeVal() {
        const baseVal = choreoCounters.insBase * 4;
        const compVal = choreoCounters.insComp * 10;
        const tot = Math.min(30, baseVal + compVal);
        document.getElementById('choreo-ins-base-val').textContent = baseVal;
        document.getElementById('choreo-ins-comp-val').textContent = compVal;
        // visual hint in composed total if capped
        if (baseVal + compVal > 30) {
            document.getElementById('choreo-ins-comp-val').style.color = 'var(--color-warning)';
        } else {
            document.getElementById('choreo-ins-comp-val').style.color = '';
        }
    }

    function updateEsterneVal() {
        const pVal = choreoCounters.estParz * 1;
        const bVal = choreoCounters.estBase * 3;
        const cVal = choreoCounters.estComp * 5;
        const tot = Math.min(68, pVal + bVal + cVal);
        // visual warnings
        if (pVal + bVal + cVal > 68) {
            document.getElementById('choreo-est-comp-val').style.color = 'var(--color-warning)';
        } else {
            document.getElementById('choreo-est-comp-val').style.color = '';
        }
    }

    function getInsiemeRaw() {
        return Math.min(30, (choreoCounters.insBase * 4) + (choreoCounters.insComp * 10));
    }

    function getEsterneRaw() {
        return Math.min(68, (choreoCounters.estParz * 1) + (choreoCounters.estBase * 3) + (choreoCounters.estComp * 5));
    }

    function calculateChoreoRawTotal() {
        const pres = choreoCounters.pres * 10;
        const ins = getInsiemeRaw();
        const est = getEsterneRaw();
        const cong = choreoCounters.cong * 5;
        const sinc = choreoCounters.sinc * 1;
        
        return pres + ins + est + cong + sinc;
    }

    function updateChoreoScore() {
        const raw = calculateChoreoRawTotal();
        const scaled = parseFloat(((raw / 135) * 9.5).toFixed(2));
        
        choreoRawTotalDisplay.textContent = raw;
        choreoScaledTotalDisplay.textContent = scaled.toFixed(2);
    }

    // FINAL RESULTS CALCULATION
    function calculateTimePenalty() {
        const totalSeconds = totalTimeMs / 1000;
        // Limit is 6'10" (370 seconds)
        if (totalSeconds <= 370) return 0.0;
        
        const deviation = totalSeconds - 370;
        if (deviation >= 30) {
            return 3.50; // flat 3.5 points penalty
        }
        
        // 0.3 points for every 5 seconds (or fraction)
        const fiveSecondBlocks = Math.ceil(deviation / 5);
        return parseFloat((fiveSecondBlocks * 0.30).toFixed(2));
    }

    function updateFinalResults() {
        if (!sessionActive) return;

        // 1. Group info
        resGroupName.textContent = groupName;
        resPhaseNote.textContent = phaseNote;
        resRoleBadge.textContent = selectRole.options[selectRole.selectedIndex].text;
        
        // Timer display
        const m = Math.floor(totalTimeMs / 60000);
        const s = Math.floor((totalTimeMs % 60000) / 1000);
        const t = Math.floor((totalTimeMs % 1000) / 100);
        resTotalTime.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${t}`;

        // 2. Score calculations
        let difficultyScore = 0.0;
        let portamentoScore = 0.0;
        let execPenalties = 0.0;
        let timePenalty = calculateTimePenalty();
        
        // Calculations based on role
        if (role === 'coreografia') {
            const rawChoreo = calculateChoreoRawTotal();
            difficultyScore = parseFloat(((rawChoreo / 135) * 9.5).toFixed(2));
            portamentoScore = choreoCounters.portamento;
            
            resValDiff.textContent = `${difficultyScore.toFixed(2)} / 9.50`;
            resValPort.textContent = `${portamentoScore.toFixed(2)} / 0.50`;
            resValPort.parentElement.classList.remove('hidden');
            resRowAddendum.classList.add('hidden');
            resRowDifficultyDisplay.classList.remove('hidden');
        } else if (role === 'supervisore') {
            resValPort.parentElement.classList.add('hidden');
            resRowAddendum.classList.add('hidden');
            resRowDifficultyDisplay.classList.add('hidden');
        } else {
            // Tamburi or Chiarine difficulty calculation
            const diffCalc = calculateDifficulty();
            difficultyScore = diffCalc.scaled;
            
            if (isNaturalChiarine) {
                const addendum = parseFloat((difficultyScore * 0.12).toFixed(2));
                resValAddendum.textContent = `+${addendum.toFixed(2)}`;
                resRowAddendum.classList.remove('hidden');
                difficultyScore = parseFloat(Math.min(10.0, difficultyScore + addendum).toFixed(2));
            } else {
                resRowAddendum.classList.add('hidden');
            }
            
            resValDiff.textContent = `${difficultyScore.toFixed(2)} / 10.00`;
            resValPort.parentElement.classList.add('hidden'); // no portamento row for individual instruments
            resRowDifficultyDisplay.classList.remove('hidden');
        }
        
        // Execution penalties
        penalties.forEach(p => {
            if (p === 'lieve') execPenalties += 0.10;
            else if (p === 'media') execPenalties += 0.30;
            else if (p === 'grave') execPenalties += 0.60;
            else if (p === 'extra') {
                execPenalties += (role === 'coreografia' || role === 'supervisore') ? 2.50 : 0.90;
            }
        });
        
        resValExecPenalties.textContent = `-${execPenalties.toFixed(2)}`;
        resValTimePenalty.textContent = `-${timePenalty.toFixed(2)}`;
        
        // Final Score
        let finalScore = 0.0;
        if (role === 'coreografia') {
            finalScore = (difficultyScore + portamentoScore) - execPenalties - timePenalty;
        } else if (role === 'supervisore') {
            // Supervisore aggregates Tamburi, Chiarine, Coreografia averages
            // For supervisore, let's load or ask user inputs
            // We can calculate: (Tamburi + Chiarine + Coreo) / 3 - Time_Penalty - Inspector_Penalty
            // Let's implement an interactive average helper in Supervisore mode!
            // Wait, let's look at supervisore input setup!
            difficultyScore = 10.0; // default base or custom input
            finalScore = (supervisoreScores.tamburi + supervisoreScores.chiarine + supervisoreScores.coreografia) / 3;
            finalScore = finalScore - execPenalties - timePenalty - inspectorPenalties;
        } else {
            finalScore = difficultyScore - execPenalties - timePenalty;
        }
        
        finalScore = Math.max(0, finalScore);
        resValTotalScore.textContent = finalScore.toFixed(2);
    }

    // MODAL STATE MANAGEMENT
    function showModal(show) {
        if (show) {
            modalManualTune.classList.remove('hidden');
        } else {
            modalManualTune.classList.add('hidden');
        }
    }

    // LOCAL STORAGE HISTORY
    function saveSessionToStorage() {
        if (!sessionActive) return;
        
        const calc = calculateDifficulty();
        const rawChoreo = calculateChoreoRawTotal();
        
        const session = {
            id: Date.now(),
            date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            groupName: groupName,
            phaseNote: phaseNote,
            role: role,
            isNaturalChiarine: isNaturalChiarine,
            totalTimeMs: totalTimeMs,
            tunes: [...tunes],
            penalties: [...penalties],
            inspectorPenalties: inspectorPenalties,
            choreoCounters: {...choreoCounters},
            finalScore: parseFloat(resValTotalScore.textContent)
        };
        
        let history = JSON.parse(localStorage.getItem('fisb_musici_history') || '[]');
        history.push(session);
        localStorage.setItem('fisb_musici_history', JSON.stringify(history));
        
        alert(`Valutazione per "${groupName}" salvata con successo!`);
        
        loadHistory();
        discardCurrentSession();
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('fisb_musici_history') || '[]');
        
        // Sort history by score descending (ranking)
        history.sort((a, b) => b.finalScore - a.finalScore);
        
        // Render recent list on setup page
        recentSessionsList.innerHTML = '';
        if (history.length === 0) {
            recentSessionsList.innerHTML = '<p class="empty-state">Nessuna valutazione salvata in locale.</p>';
        } else {
            history.slice(0, 3).forEach(s => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-info">
                        <h4>${s.groupName}</h4>
                        <p>${s.date} - ${s.phaseNote} (${s.role.toUpperCase()})</p>
                    </div>
                    <div class="history-score text-green">${s.finalScore.toFixed(2)}</div>
                `;
                recentSessionsList.appendChild(div);
            });
        }

        // Render full list on results/history page
        fullHistoryList.innerHTML = '';
        if (history.length === 0) {
            fullHistoryList.innerHTML = '<p class="empty-state">Nessuna valutazione salvata.</p>';
            btnClearHistory.classList.add('hidden');
        } else {
            btnClearHistory.classList.remove('hidden');
            history.forEach((s, idx) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                
                let rankSymbol = `#${idx + 1}`;
                if (idx === 0) rankSymbol = '🥇';
                else if (idx === 1) rankSymbol = '🥈';
                else if (idx === 2) rankSymbol = '🥉';

                div.innerHTML = `
                    <div class="history-info">
                        <h4>${rankSymbol} ${s.groupName}</h4>
                        <p>${s.date} - ${s.phaseNote} (${s.role.toUpperCase()})</p>
                    </div>
                    <div class="history-score text-green">${s.finalScore.toFixed(2)}</div>
                `;
                fullHistoryList.appendChild(div);
            });
        }
    }

    function clearAllHistory() {
        if (confirm('Sei sicuro di voler cancellare tutto lo storico delle valutazioni? Questa azione è irreversibile.')) {
            localStorage.removeItem('fisb_musici_history');
            loadHistory();
        }
    }

    function discardCurrentSession() {
        if (confirm('Vuoi iniziare una nuova valutazione? I dati correnti non salvati andranno persi.')) {
            sessionActive = false;
            tunes = [];
            penalties = [];
            totalTimeMs = 0;
            clearInterval(timerInterval);
            timerRunning = false;
            
            // Disable navigation
            navItems.forEach(item => {
                if (item !== navSetup) item.classList.add('disabled');
            });
            
            inputGroupName.value = '';
            inputPhase.value = '';
            
            switchView('view-setup');
        }
    }

    // GENERATE AND COPY EMOJI FORMATTED TEXT REPORT
    function copyFormattedReport() {
        if (!sessionActive) return;
        
        const calc = calculateDifficulty();
        const score = resValTotalScore.textContent;
        const totalSecs = totalTimeMs / 1000;
        const minutes = Math.floor(totalSecs / 60);
        const seconds = Math.floor(totalSecs % 60);
        
        let roleName = 'Tamburi';
        if (role === 'chiarine') roleName = 'Chiarine';
        if (role === 'coreografia') roleName = 'Coreografia';
        if (role === 'supervisore') roleName = 'Supervisore';

        let text = `🛡️ *FISB MUSICI LIVE REPORT* 🛡️\n`;
        text += `------------------------------------\n`;
        text += `👤 *Gruppo:* ${groupName}\n`;
        text += `📅 *Fase:* ${phaseNote}\n`;
        text += `🎭 *Ruolo Giudice:* ${roleName}\n`;
        text += `⏱️ *Tempo Esercizio:* ${minutes}:${String(seconds).padStart(2, '0')}\n`;
        text += `------------------------------------\n`;
        
        if (role === 'coreografia') {
            const rawChoreo = calculateChoreoRawTotal();
            text += `📐 *Coreografia Musici:* ${rawChoreo}/135 pt (Scalato: ${choreoScaledTotalDisplay.textContent}/9.50)\n`;
            text += `🧍 *Portamento:* ${selectPortamento.options[selectPortamento.selectedIndex].text.split('(')[0].trim()} (${choreoCounters.portamento} pt)\n`;
        } else if (role === 'supervisore') {
            text += `🥁 *Voto Tamburi:* ${supervisoreScores.tamburi.toFixed(2)} pt\n`;
            text += `🎺 *Voto Chiarine:* ${supervisoreScores.chiarine.toFixed(2)} pt\n`;
            text += `📐 *Voto Coreografia:* ${supervisoreScores.coreografia.toFixed(2)} pt\n`;
        } else {
            text += `🎼 *Difficoltà Musicale:* ${calc.scaled.toFixed(2)}/10.00\n`;
            text += `📊 *Brani Registrati:* ${tunes.length}\n`;
            tunes.forEach((t, idx) => {
                text += `  • Brano ${idx+1}: ${t.duration}s -> Classe ${getTuneClass(t.duration)} (${t.voices} Voc${t.voices > 1 ? 'i' : 'e'})\n`;
            });
            if (isNaturalChiarine) {
                text += `🌿 *Addendum Chiarine Naturali:* +12%\n`;
            }
        }
        
        let execL = countLDisplay.textContent;
        let execM = countMDisplay.textContent;
        let execG = countGDisplay.textContent;
        let execX = countXDisplay.textContent;
        
        text += `⚠️ *Penalità Esecuzione:* L:${execL} | M:${execM} | G:${execG} | V:${execX} (Totale: ${resValExecPenalties.textContent} pt)\n`;
        
        const timePen = calculateTimePenalty();
        if (timePen > 0) {
            text += `⏱️ *Penalità Tempo:* -${timePen.toFixed(2)} pt\n`;
        }
        
        text += `------------------------------------\n`;
        text += `🏆 *PUNTEGGIO TOTALE:* *${score}* / 10.00 pt\n`;
        text += `------------------------------------\n`;
        text += `Generato con FISB Musici Live Evaluator App`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert('Report copiato negli appunti! Ora puoi incollarlo su WhatsApp o Telegram.');
        }).catch(err => {
            console.error('Errore nella copia del report: ', err);
            alert('Impossibile copiare il report automaticamente. Selezionalo manualmente dal prompt.');
        });
    }

    // EXPOSE LOGIC GLOBALLY FOR INLINE ONCLICK EVENTS
    window.app = {
        updateTuneVoices: updateTuneVoices,
        deleteTune: deleteTune,
        toggleTuneDifficulty: toggleTuneDifficulty,
        toggleTuneDeclass: toggleTuneDeclass
    };
});
