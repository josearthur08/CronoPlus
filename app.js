/**
 * CRONOPLUS - Sistema de Cronometragem de Corrida
 * Aplicação robusta com persistência garantida de dados
 */

// ============================================================================
// CONFIGURAÇÃO DE ARMAZENAMENTO PERSISTENTE
// ============================================================================

const STORAGE_KEYS = {
    GENDER: 'cronoplus_gender',
    RUNNERS: 'cronoplus_runners',
    CHRONO_START: 'cronoplus_chrono_start',
    CHRONO_RUNNING: 'cronoplus_chrono_running',
    RACE_FINISHED: 'cronoplus_race_finished'
};

// ============================================================================
// ESTADO GLOBAL
// ============================================================================

let appState = {
    gender: null,
    runners: [],
    chronometerStartTime: null,
    chronometerRunning: false,
    raceFinished: false,
    chronometerIntervalId: null
};

const genderLabels = {
    M: 'Masculino',
    F: 'Feminino'
};

// ============================================================================
// SISTEMA DE PERSISTÊNCIA
// ============================================================================

/**
 * Salva o estado completo no localStorage com validação
 */
function persistState() {
    try {
        // Salvar gênero
        if (appState.gender) {
            localStorage.setItem(STORAGE_KEYS.GENDER, appState.gender);
        }

        // Salvar corredores (dado crítico)
        localStorage.setItem(STORAGE_KEYS.RUNNERS, JSON.stringify(appState.runners));

        // Salvar cronômetro
        if (appState.chronometerStartTime) {
            localStorage.setItem(STORAGE_KEYS.CHRONO_START, appState.chronometerStartTime);
        }
        localStorage.setItem(STORAGE_KEYS.CHRONO_RUNNING, appState.chronometerRunning ? 'true' : 'false');

        // Salvar status da corrida
        localStorage.setItem(STORAGE_KEYS.RACE_FINISHED, appState.raceFinished ? 'true' : 'false');

        console.log('✅ Estado persistido');
    } catch (e) {
        console.error('❌ Erro ao persistir:', e);
    }
}

/**
 * Carrega o estado do localStorage
 */
function loadState() {
    try {
        const savedGender = localStorage.getItem(STORAGE_KEYS.GENDER);
        const savedRunners = localStorage.getItem(STORAGE_KEYS.RUNNERS);
        const savedChrono = localStorage.getItem(STORAGE_KEYS.CHRONO_START);
        const savedRunning = localStorage.getItem(STORAGE_KEYS.CHRONO_RUNNING);
        const savedFinished = localStorage.getItem(STORAGE_KEYS.RACE_FINISHED);

        if (savedGender) appState.gender = savedGender;
        if (savedRunners) {
            const parsed = JSON.parse(savedRunners);
            if (Array.isArray(parsed)) appState.runners = parsed;
        }
        if (savedChrono) appState.chronometerStartTime = savedChrono;
        if (savedRunning) appState.chronometerRunning = savedRunning === 'true';
        if (savedFinished) appState.raceFinished = savedFinished === 'true';

        console.log('✅ Estado carregado - Corredores:', appState.runners.length);
        return true;
    } catch (e) {
        console.error('❌ Erro ao carregar:', e);
        return false;
    }
}

/**
 * Limpa todos os dados (apenas ao iniciar nova corrida)
 */
function clearAllStorage() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('🗑️ Armazenamento limpo');
}

// ============================================================================
// SINCRONIZAÇÃO ENTRE ABAS
// ============================================================================

window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.RUNNERS) {
        const newRunners = JSON.parse(e.newValue || '[]');
        appState.runners = newRunners;
        updateScoreboard();
    }

    if (e.key === STORAGE_KEYS.CHRONO_RUNNING) {
        appState.chronometerRunning = e.newValue === 'true';
        if (appState.chronometerRunning) {
            startChronometerDisplay();
        } else {
            stopChronometerDisplay();
        }
        updateChronometerButton();
    }

    if (e.key === STORAGE_KEYS.CHRONO_START) {
        appState.chronometerStartTime = e.newValue;
        updateStartTimeDisplay();
    }
});

// ============================================================================
// INICIALIZAÇÃO DO APLICATIVO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CRONOPLUS iniciando...');
    
    // Carregar estado salvo
    loadState();
    
    // Registrar listeners de eventos
    attachEventListeners();
    
    // Determinar tela inicial
    if (appState.raceFinished) {
        // Se corrida acabou, mostrar relatório
        showScreen('screenReport');
        displaySavedReport();
    } else if (appState.gender) {
        // Se gênero selecionado, mostrar tela principal
        showScreen('screenMain');
        updateGenderDisplay();
        updateScoreboard();
        updateChronometerButton();
        
        // Restaurar cronômetro se estava rodando
        if (appState.chronometerStartTime) {
            updateStartTimeDisplay();
            if (appState.chronometerRunning) {
                startChronometerDisplay();
            } else {
                const elapsed = new Date().getTime() - parseInt(appState.chronometerStartTime);
                updateChronometerDisplay(elapsed);
            }
        }
    } else {
        // Caso contrário, mostrar seleção de gênero
        showScreen('screenSexSelection');
    }
    
    console.log('✅ CRONOPLUS pronto');
    
    // Backup automático a cada 3 segundos
    setInterval(() => {
        if (appState.runners.length > 0) {
            persistState();
        }
    }, 3000);
});

// ============================================================================
// GERENCIAMENTO DE TELAS
// ============================================================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

// ============================================================================
// SELEÇÃO DE GÊNERO
// ============================================================================

function selectGender(gender) {
    console.log(`👥 Gênero selecionado: ${genderLabels[gender]}`);
    
    appState.gender = gender;
    persistState();
    
    updateGenderDisplay();
    showScreen('screenMain');
    
    // Focus no input para iniciar rápido
    setTimeout(() => {
        const input = document.getElementById('runnerNumber');
        if (input) input.focus();
    }, 100);
}

function updateGenderDisplay() {
    if (!appState.gender) return;

    const badge = document.getElementById('genderBadge');
    const scoreboardGender = document.getElementById('scoreboardGender');
    const genderText = genderLabels[appState.gender];
    const genderClass = appState.gender === 'M' ? 'masculine' : 'feminine';

    if (badge) {
        badge.textContent = genderText;
        badge.className = `gender-badge ${genderClass}`;
    }

    if (scoreboardGender) {
        scoreboardGender.textContent = genderText;
    }
}

// ============================================================================
// CRONÔMETRO
// ============================================================================

function startChronometerClick() {
    if (appState.chronometerRunning) {
        return;
    }

    if (!appState.chronometerStartTime) {
        const now = new Date().getTime().toString();
        appState.chronometerStartTime = now;
        appState.chronometerRunning = true;
        
        persistState();
        updateChronometerButton();
        startChronometerDisplay();
        updateStartTimeDisplay();
        
        showMessage('✅ Cronômetro iniciado!', 'success');
    }
}

function startChronometerDisplay() {
    if (appState.chronometerIntervalId) {
        clearInterval(appState.chronometerIntervalId);
    }

    appState.chronometerIntervalId = setInterval(() => {
        if (appState.chronometerStartTime) {
            const elapsed = new Date().getTime() - parseInt(appState.chronometerStartTime);
            updateChronometerDisplay(elapsed);
        }
    }, 100);
}

function stopChronometerDisplay() {
    if (appState.chronometerIntervalId) {
        clearInterval(appState.chronometerIntervalId);
        appState.chronometerIntervalId = null;
    }
}

function updateChronometerDisplay(elapsedMs) {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const displayEl = document.getElementById('chronometerDisplay');
    if (displayEl) {
        displayEl.textContent = display;
    }

    const statusEl = document.getElementById('chronoStatus');
    if (statusEl) {
        statusEl.textContent = appState.chronometerRunning ? '⏱️ Cronômetro em andamento...' : '⏹️ Cronômetro parado';
    }
}

function updateStartTimeDisplay() {
    if (appState.chronometerStartTime) {
        const startDate = new Date(parseInt(appState.chronometerStartTime));
        const timeString = startDate.toLocaleTimeString('pt-BR');
        const el = document.getElementById('chronoStartTime');
        if (el) {
            el.textContent = `Horário de início: ${timeString}`;
        }
    }
}

function updateChronometerButton() {
    const btn = document.getElementById('btnStartChrono');
    if (!btn) return;

    if (appState.chronometerRunning) {
        btn.disabled = true;
        btn.textContent = '⏹️ Cronômetro em andamento';
    } else if (appState.chronometerStartTime) {
        btn.disabled = true;
        btn.textContent = '✓ Cronômetro já iniciado';
    } else {
        btn.disabled = false;
        btn.textContent = '▶ Iniciar Cronômetro';
    }
}

// ============================================================================
// REGISTRO DE CORREDORES
// ============================================================================

function registerRunner() {
    if (appState.raceFinished) {
        showMessage('❌ Corrida finalizada!', 'error');
        return;
    }

    if (!appState.chronometerRunning) {
        showMessage('❌ Inicie o cronômetro primeiro!', 'error');
        return;
    }

    const input = document.getElementById('runnerNumber');
    if (!input) return;

    const runnerNumber = input.value.trim();

    if (!runnerNumber) {
        showMessage('❌ Insira o número!', 'error');
        return;
    }

    if (!Number.isInteger(Number(runnerNumber)) || Number(runnerNumber) <= 0) {
        showMessage('❌ Número inválido!', 'error');
        return;
    }

    // Verificar duplicação
    const existingRunner = appState.runners.find(
        r => r.number == runnerNumber && r.gender === appState.gender
    );
    if (existingRunner) {
        showMessage(`⚠️ Corredor #${runnerNumber} já registrado!`, 'error');
        input.value = '';
        input.focus();
        return;
    }

    // Criar registro
    const now = new Date().getTime();
    const timeElapsed = now - parseInt(appState.chronometerStartTime);
    const totalSeconds = Math.floor(timeElapsed / 1000);

    const runner = {
        id: Date.now() + Math.random(),
        number: parseInt(runnerNumber),
        gender: appState.gender,
        arrivalTime: now,
        elapsedSeconds: totalSeconds
    };

    appState.runners.push(runner);
    persistState();

    showMessage(`✅ Corredor #${runnerNumber} registrado!`, 'success');

    input.value = '';
    input.focus();

    updateScoreboard();
}

// ============================================================================
// PLACAR EM TEMPO REAL
// ============================================================================

function updateScoreboard() {
    if (!appState.gender) return;

    const scoreboardEl = document.getElementById('scoreboardContainer');
    if (!scoreboardEl) return;

    const currentGenderRunners = appState.runners.filter(r => r.gender === appState.gender);

    if (currentGenderRunners.length === 0) {
        scoreboardEl.innerHTML = '<div class="empty-state">Aguardando registros...</div>';
        const countEl = document.getElementById('totalRunners');
        if (countEl) countEl.textContent = '0 corredores';
        return;
    }

    // Ordenar por tempo de chegada
    const sorted = [...currentGenderRunners].sort((a, b) => a.arrivalTime - b.arrivalTime);

    // Renderizar placar
    scoreboardEl.innerHTML = sorted.map((runner, index) => `
        <div class="runner-row">
            <div class="runner-position">${index + 1}º</div>
            <div class="runner-number">#${runner.number}</div>
            <div class="runner-time">${formatTime(runner.elapsedSeconds)}</div>
        </div>
    `).join('');

    const countEl = document.getElementById('totalRunners');
    if (countEl) {
        countEl.textContent = `${currentGenderRunners.length} corredor${currentGenderRunners.length !== 1 ? 'es' : ''}`;
    }
}

// ============================================================================
// FINALIZAÇÃO E RELATÓRIO
// ============================================================================

function generateReport() {
    if (!appState.chronometerStartTime) {
        showMessage('❌ Nenhuma corrida foi iniciada!', 'error');
        return;
    }

    if (appState.runners.length === 0) {
        showMessage('❌ Nenhum corredor foi registrado!', 'error');
        return;
    }

    // Finalizar corrida
    appState.raceFinished = true;
    persistState();
    stopChronometerDisplay();

    // Gerar e exibir relatório
    const reportHTML = generateReportHTML();
    const reportEl = document.getElementById('reportContent');
    if (reportEl) {
        reportEl.innerHTML = reportHTML;
    }

    const timestampEl = document.getElementById('reportTimestamp');
    if (timestampEl) {
        const now = new Date();
        timestampEl.textContent = `Gerado em: ${now.toLocaleString('pt-BR')}`;
    }

    showScreen('screenReport');
}

function generateReportHTML() {
    const runnersByGender = {
        M: appState.runners.filter(r => r.gender === 'M'),
        F: appState.runners.filter(r => r.gender === 'F')
    };

    let html = '';

    ['M', 'F'].forEach(gender => {
        const runners = runnersByGender[gender];
        if (runners.length === 0) return;

        const sorted = [...runners].sort((a, b) => a.arrivalTime - b.arrivalTime);

        html += `
            <div class="report-section">
                <h2 class="report-section-title">${genderLabels[gender].toUpperCase()}</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th style="width: 10%;">COL.</th>
                            <th style="width: 15%;">NÚMERO</th>
                            <th style="width: 30%;">TEMPO</th>
                            <th style="width: 10%;">GÊNERO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map((runner, index) => `
                            <tr>
                                <td><strong>${index + 1}º</strong></td>
                                <td>#${runner.number}</td>
                                <td><strong>${formatTime(runner.elapsedSeconds)}</strong></td>
                                <td>${genderLabels[runner.gender]}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    });

    // Resumo geral
    html += `
        <div class="report-section">
            <h2 class="report-section-title">RESUMO GERAL</h2>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>GÊNERO</th>
                        <th>TOTAL DE CORREDORES</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(runnersByGender).map(([gender, runners]) => 
                        runners.length > 0 ? `
                            <tr>
                                <td>${genderLabels[gender]}</td>
                                <td>${runners.length}</td>
                            </tr>
                        ` : ''
                    ).join('')}
                    <tr style="background-color: #dbeafe; font-weight: 700;">
                        <td>TOTAL</td>
                        <td>${appState.runners.length}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    return html;
}

function displaySavedReport() {
    const reportHTML = generateReportHTML();
    const reportEl = document.getElementById('reportContent');
    if (reportEl) {
        reportEl.innerHTML = reportHTML;
    }
}

function printReport() {
    window.print();
}

function downloadExcel() {
    const workbook = XLSX.utils.book_new();

    ['M', 'F'].forEach(gender => {
        const runners = appState.runners.filter(r => r.gender === gender);
        if (runners.length === 0) return;

        const sorted = [...runners].sort((a, b) => a.arrivalTime - b.arrivalTime);

        const data = sorted.map((runner, index) => ({
            'Colocação': index + 1,
            'Número': runner.number,
            'Tempo': formatTime(runner.elapsedSeconds),
            'Gênero': genderLabels[runner.gender]
        }));

        const sheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, sheet, genderLabels[gender]);
    });

    const summaryData = [
        { 'Gênero': 'Masculino', 'Total de Corredores': appState.runners.filter(r => r.gender === 'M').length },
        { 'Gênero': 'Feminino', 'Total de Corredores': appState.runners.filter(r => r.gender === 'F').length },
        { 'Gênero': 'TOTAL', 'Total de Corredores': appState.runners.length }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    const fileName = `Cronometragem_Corrida_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function startNewRace() {
    if (confirm('INICIAR UMA NOVA CORRIDA? Todos os dados serão APAGADOS.')) {
        resetAllData();
    }
}

function resetRace() {
    if (confirm('RESETAR A CORRIDA? Voltar à seleção de gênero?')) {
        resetAllData();
    }
}

function resetAllData() {
    appState = {
        gender: null,
        runners: [],
        chronometerStartTime: null,
        chronometerRunning: false,
        raceFinished: false,
        chronometerIntervalId: null
    };

    clearAllStorage();
    stopChronometerDisplay();

    // Resetar interface
    const displayEl = document.getElementById('chronometerDisplay');
    if (displayEl) displayEl.textContent = '00:00:00';
    
    const statusEl = document.getElementById('chronoStatus');
    if (statusEl) statusEl.textContent = 'Cronômetro parado';
    
    const startEl = document.getElementById('chronoStartTime');
    if (startEl) startEl.textContent = 'Horário de início: --:--:--';
    
    const inputEl = document.getElementById('runnerNumber');
    if (inputEl) inputEl.value = '';

    showScreen('screenSexSelection');
}

// ============================================================================
// REGISTRO DE EVENTOS
// ============================================================================

function attachEventListeners() {
    // Seleção de Sexo
    const btnM = document.getElementById('btnMasculino');
    const btnF = document.getElementById('btnFeminino');

    if (btnM) btnM.addEventListener('click', () => selectGender('M'));
    if (btnF) btnF.addEventListener('click', () => selectGender('F'));

    // Cronômetro
    const btnStartChrono = document.getElementById('btnStartChrono');
    if (btnStartChrono) {
        btnStartChrono.addEventListener('click', startChronometerClick);
    }

    // Registro
    const btnRegister = document.getElementById('btnRegister');
    const runnerNumber = document.getElementById('runnerNumber');

    if (btnRegister) {
        btnRegister.addEventListener('click', registerRunner);
    }
    if (runnerNumber) {
        runnerNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerRunner();
        });
    }

    // Finalização
    const btnGenerateReport = document.getElementById('btnGenerateReport');
    if (btnGenerateReport) {
        btnGenerateReport.addEventListener('click', generateReport);
    }

    const btnResetRace = document.getElementById('btnResetRace');
    if (btnResetRace) {
        btnResetRace.addEventListener('click', resetRace);
    }

    // Relatório
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', printReport);
    }

    const btnDownloadExcel = document.getElementById('btnDownloadExcel');
    if (btnDownloadExcel) {
        btnDownloadExcel.addEventListener('click', downloadExcel);
    }

    const btnNewRace = document.getElementById('btnNewRace');
    if (btnNewRace) {
        btnNewRace.addEventListener('click', startNewRace);
    }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showMessage(message, type = 'info') {
    const msgEl = document.getElementById('registrationMessage');
    if (!msgEl) return;

    msgEl.textContent = message;
    msgEl.className = `registration-message ${type}`;

    setTimeout(() => {
        msgEl.textContent = '';
        msgEl.className = 'registration-message';
    }, 3000);
}

// ============================================================================
// SINCRONIZAÇÃO AO RETORNAR AO APP
// ============================================================================

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && appState.chronometerRunning) {
        startChronometerDisplay();
    }
});

// ============================================================================
// PROTEÇÃO CONTRA PERDA DE DADOS
// ============================================================================

window.addEventListener('beforeunload', (e) => {
    if (appState.runners.length > 0 && !appState.raceFinished) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log('✅ App.js carregado');
