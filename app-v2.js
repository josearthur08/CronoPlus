console.log('🚀 CRONOPLUS v2 iniciando...');

// ============================================================================
// GERADOR DE ÁUDIO
// ============================================================================

function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        if (type === 'success') {
            // Som de sucesso (dois beeps)
            const osc1 = audioContext.createOscillator();
            const osc2 = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioContext.destination);
            
            osc1.frequency.value = 800;
            osc2.frequency.value = 1200;
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.2);
            osc2.stop(now + 0.2);
        } else if (type === 'error') {
            // Som de erro (beep baixo)
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = 400;
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'warning') {
            // Som de aviso (beep médio)
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = 600;
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) {
        console.log('Áudio não disponível');
    }
}

function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// ============================================================================
// ESTADO
// ============================================================================

let state = {
    gender: localStorage.getItem('gender') || null,
    runners: JSON.parse(localStorage.getItem('runners') || '[]'),
    startTime: localStorage.getItem('startTime') || null,
    running: localStorage.getItem('running') === 'true',
    finished: localStorage.getItem('finished') === 'true',
    chronoInterval: null,
    sessionId: localStorage.getItem('sessionId') || generateSessionId(),
    editingRunner: null,
    syncTimer: null,
    syncEnabled: false,
    syncRole: 'host'
};

function generateSessionId() {
    const id = 'cronoplus_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('sessionId', id);
    return id;
}

function save() {
    localStorage.setItem('gender', state.gender || '');
    localStorage.setItem('runners', JSON.stringify(state.runners));
    localStorage.setItem('startTime', state.startTime || '');
    localStorage.setItem('running', state.running);
    localStorage.setItem('finished', state.finished);
    localStorage.setItem('sessionId', state.sessionId);
    console.log('💾 Estado salvo');
    syncToServer();
}

function getSyncEndpoint() {
    return new URL('sync.php', window.location.href).toString();
}

async function syncToServer() {
    if (!state.syncEnabled || state.syncRole !== 'host') return;

    try {
        await fetch(getSyncEndpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'save',
                sessionId: state.sessionId,
                state: {
                    gender: state.gender,
                    runners: state.runners,
                    startTime: state.startTime,
                    running: state.running,
                    finished: state.finished
                }
            })
        });
    } catch (error) {
        console.log('Falha ao sincronizar com servidor:', error);
    }
}

async function loadRemoteState() {
    if (!state.syncEnabled || !state.sessionId) return;

    try {
        const response = await fetch(`${getSyncEndpoint()}?action=load&sessionId=${encodeURIComponent(state.sessionId)}`, {
            cache: 'no-store'
        });

        if (!response.ok) return;

        const payload = await response.json();
        if (!payload || !payload.state) return;

        const remoteState = payload.state;
        state.gender = remoteState.gender || state.gender;
        state.runners = Array.isArray(remoteState.runners) ? remoteState.runners : state.runners;
        state.startTime = remoteState.startTime || state.startTime;
        state.running = !!remoteState.running;
        state.finished = !!remoteState.finished;

        save();
        if (state.gender) updateDisplay();
        updateScoreboard();
    } catch (error) {
        console.log('Falha ao carregar sincronização remota:', error);
    }
}

// ============================================================================
// INTERFACE
// ============================================================================

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen' + name).classList.add('active');
    console.log('📺 Tela:', name);
}

function showMessage(text, type = 'info') {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = 'registration-message ' + type;
    
    // Som e vibração
    if (type === 'success') {
        playSound('success');
        vibrate([50, 100, 50]);
    } else if (type === 'error') {
        playSound('error');
        vibrate([100, 50, 100]);
    } else if (type === 'warning') {
        playSound('warning');
        vibrate([75]);
    }
    
    setTimeout(() => { msg.textContent = ''; msg.className = 'registration-message'; }, 3500);
}

function scheduleSyncPull() {
    if (state.syncTimer) clearInterval(state.syncTimer);
    state.syncTimer = setInterval(() => {
        loadRemoteState();
    }, 2500);
}

function enableSyncMode(syncId, role = 'client') {
    if (!syncId) return;
    state.sessionId = syncId;
    state.syncEnabled = true;
    state.syncRole = role;
    localStorage.setItem('sessionId', state.sessionId);
    scheduleSyncPull();
}

// ============================================================================
// SELEÇÃO DE GÊNERO
// ============================================================================

document.getElementById('btnMasculino').addEventListener('click', () => {
    console.log('👨 Masculino selecionado');
    state.gender = 'M';
    save();
    showScreen('Main');
    updateDisplay();
    document.getElementById('runnerNumber').focus();
});

document.getElementById('btnFeminino').addEventListener('click', () => {
    console.log('👩 Feminino selecionado');
    state.gender = 'F';
    save();
    showScreen('Main');
    updateDisplay();
    document.getElementById('runnerNumber').focus();
});

// ============================================================================
// CRONÔMETRO
// ============================================================================

document.getElementById('btnStart').addEventListener('click', () => {
    if (state.running) return;
    state.startTime = new Date().getTime().toString();
    state.running = true;
    save();
    updateDisplay();
    startChrono();
    showMessage('✅ Cronômetro iniciado!', 'success');
});

function startChrono() {
    if (state.chronoInterval) clearInterval(state.chronoInterval);
    state.chronoInterval = setInterval(() => {
        const elapsed = new Date().getTime() - parseInt(state.startTime);
        const sec = Math.floor(elapsed / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.getElementById('chronometerDisplay').textContent = time;
    }, 100);
}

// ============================================================================
// REGISTRO
// ============================================================================

document.getElementById('btnRegister').addEventListener('click', registerRunner);
document.getElementById('runnerNumber').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') registerRunner();
});

function registerRunner() {
    if (state.finished) { showMessage('❌ Corrida finalizada! Reinicie para nova corrida.', 'error'); return; }
    if (!state.running) { showMessage('⏹️ Inicie o cronômetro primeiro!', 'error'); return; }
    
    const input = document.getElementById('runnerNumber');
    const num = input.value.trim();
    
    if (!num) { showMessage('📝 Digite o número do corredor', 'warning'); return; }
    if (!/^\d+$/.test(num)) { showMessage('❌ Apenas números são permitidos!', 'error'); return; }
    if (parseInt(num) <= 0) { showMessage('❌ Número deve ser maior que 0!', 'error'); return; }
    
    const elapsed = Math.floor((new Date().getTime() - parseInt(state.startTime)) / 1000);
    
    // Procurar se corredor já existe
    const existingRunner = state.runners.find(r => r.n === num && r.g === state.gender);
    
    if (existingRunner) {
        // Se existe, atualizar tempo e incrementar volta
        existingRunner.t = elapsed;
        existingRunner.v = existingRunner.v + 1;
        existingRunner.a = new Date().getTime();
        showMessage(`✅ Corredor #${num} - Volta ${existingRunner.v}! 🏃`, 'success');
    } else {
        // Se não existe, criar novo registro
        state.runners.push({ n: num, g: state.gender, t: elapsed, a: new Date().getTime(), v: 1 });
        showMessage(`✅ Novo corredor #${num} registrado! Volta 1 ✨`, 'success');
    }
    
    save();
    input.value = '';
    input.focus();
    updateScoreboard();
}

// ============================================================================
// PLACAR
// ============================================================================

function updateScoreboard() {
    const runners = state.runners.filter(r => r.g === state.gender).sort((a, b) => a.a - b.a);
    
    // Remover duplicatas: manter apenas o último registro de cada corredor
    const uniqueRunners = [];
    const runnerMap = new Map();
    
    runners.forEach(r => {
        runnerMap.set(r.n, r);
    });
    
    runnerMap.forEach(r => uniqueRunners.push(r));
    uniqueRunners.sort((a, b) => a.a - b.a);
    
    const html = uniqueRunners.length === 0 ? '<div class="empty-state">Aguardando...</div>' :
        uniqueRunners.map((r, i) => {
            const h = Math.floor(r.t / 3600);
            const m = Math.floor((r.t % 3600) / 60);
            const s = r.t % 60;
            return `
            <div class="runner-row" onclick="openEditModal('${r.n}', '${r.g}')">
                <div class="runner-position">${i + 1}º</div>
                <div class="runner-number">#${r.n}</div>
                <div class="runner-volta">Volta ${r.v}</div>
                <div class="runner-time">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</div>
            </div>`;
        }).join('');
    document.getElementById('scoreboard').innerHTML = html;
    const countEl = document.getElementById('runnerCount');
    if (countEl) countEl.textContent = String(uniqueRunners.length);
    
    // Adicionar estilos de cursor ao placar
    document.querySelectorAll('.runner-row').forEach(el => {
        el.style.cursor = 'pointer';
        el.style.transition = 'background 0.2s';
        el.addEventListener('mouseenter', () => el.style.background = 'rgba(0,0,0,0.05)');
        el.addEventListener('mouseleave', () => el.style.background = '');
    });
}

// ============================================================================
// MODAL EDITAR REGISTRO
// ============================================================================

function openEditModal(runnerNumber, gender) {
    const runner = state.runners.find(r => r.n === runnerNumber && r.g === gender);
    if (!runner) return;
    
    state.editingRunner = runner;
    
    document.getElementById('editRunnerNumber').value = runner.n;
    document.getElementById('editRunnerVolta').value = runner.v;
    document.getElementById('editRunnerTime').value = runner.t;
    
    document.getElementById('modalEdit').classList.add('active');
}

function closeEditModal() {
    document.getElementById('modalEdit').classList.remove('active');
    state.editingRunner = null;
}

function saveEditRunner() {
    if (!state.editingRunner) return;
    
    const newNumber = document.getElementById('editRunnerNumber').value.trim();
    const newVolta = parseInt(document.getElementById('editRunnerVolta').value);
    const newTime = parseInt(document.getElementById('editRunnerTime').value);
    
    if (!newNumber || !/^\d+$/.test(newNumber)) {
        showMessage('❌ Número inválido!', 'error');
        return;
    }
    
    if (newVolta < 1) {
        showMessage('❌ Volta deve ser pelo menos 1!', 'error');
        return;
    }
    
    if (newTime < 0) {
        showMessage('❌ Tempo não pode ser negativo!', 'error');
        return;
    }
    
    state.editingRunner.n = newNumber;
    state.editingRunner.v = newVolta;
    state.editingRunner.t = newTime;
    
    save();
    closeEditModal();
    updateScoreboard();
    showMessage('✅ Registro atualizado!', 'success');
}

function deleteRunner() {
    if (!state.editingRunner) return;
    
    if (confirm(`Deletar corredor #${state.editingRunner.n}?`)) {
        const idx = state.runners.indexOf(state.editingRunner);
        if (idx > -1) {
            state.runners.splice(idx, 1);
            save();
            closeEditModal();
            updateScoreboard();
            showMessage('🗑️ Registro deletado!', 'warning');
        }
    }
}

// ============================================================================
// BAIXAR PLACAR EM PDF
// ============================================================================

function downloadScoreboardPdf() {
    if (state.runners.length === 0) {
        showMessage('❌ Nenhum corredor para exportar!', 'error');
        return;
    }
    
    const runners = state.runners.filter(r => r.g === state.gender).sort((a, b) => a.a - b.a);
    
    // Remover duplicatas
    const uniqueRunners = [];
    const runnerMap = new Map();
    
    runners.forEach(r => {
        runnerMap.set(r.n, r);
    });
    
    runnerMap.forEach(r => uniqueRunners.push(r));
    uniqueRunners.sort((a, b) => a.a - b.a);
    
    // Criar HTML para o PDF
    let html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f3f4f6;">
        <h1 style="text-align: center; color: #dc2626; margin-bottom: 10px;">CRONOPLUS</h1>
        <h2 style="text-align: center; color: #374151; margin-bottom: 20px;">Placar - ${state.gender === 'M' ? 'MASCULINO' : 'FEMININO'}</h2>
        <p style="text-align: center; color: #6b7280; margin-bottom: 20px;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        
        <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
                <tr style="background: #dc2626; color: white;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">POSIÇÃO</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">CORREDOR</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">VOLTA</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">TEMPO</th>
                </tr>
            </thead>
            <tbody>
                ${uniqueRunners.map((r, i) => {
                    const h = Math.floor(r.t / 3600);
                    const m = Math.floor((r.t % 3600) / 60);
                    const s = r.t % 60;
                    const bgColor = i % 2 === 0 ? '#f3f4f6' : '#ffffff';
                    return `
                    <tr style="background: ${bgColor};">
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${i + 1}º</td>
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">#${r.n}</td>
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #dc2626; font-weight: bold;">Volta ${r.v}</td>
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-family: monospace;">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        <p style="text-align: center; color: #6b7280; margin-top: 20px; font-size: 12px;">Total de corredores: ${uniqueRunners.length}</p>
    </div>
    `;
    
    // Gerar PDF
    const element = document.createElement('div');
    element.innerHTML = html;
    
    const options = {
        margin: 10,
        filename: `Placar_${state.gender === 'M' ? 'Masculino' : 'Feminino'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(options).from(element).save();
    showMessage('✅ PDF gerado com sucesso!', 'success');
}

document.getElementById('btnScoreboardPdf').addEventListener('click', downloadScoreboardPdf);

// ============================================================================
// RELATÓRIO
// ============================================================================

document.getElementById('btnReport').addEventListener('click', () => {
    if (state.runners.length === 0) { showMessage('❌ Nenhum corredor!', 'error'); return; }
    state.finished = true;
    save();
    if (state.chronoInterval) clearInterval(state.chronoInterval);
    
    // Remover duplicatas: manter apenas o último registro de cada corredor
    const uniqueRunners = [];
    const runnerMap = new Map();
    
    state.runners.forEach(r => {
        const key = r.n + '_' + r.g;
        runnerMap.set(key, r);
    });
    
    runnerMap.forEach(r => uniqueRunners.push(r));
    
    const M = uniqueRunners.filter(r => r.g === 'M').sort((a, b) => a.a - b.a);
    const F = uniqueRunners.filter(r => r.g === 'F').sort((a, b) => a.a - b.a);
    
    let html = '';
    if (M.length > 0) {
        html += '<div class="report-section"><div class="report-section-title">MASCULINO</div><table class="report-table"><thead><tr><th>POSIÇÃO</th><th>CORREDOR</th><th>VOLTA</th><th>TEMPO</th></tr></thead><tbody>';
        M.forEach((r, i) => {
            const h = Math.floor(r.t / 3600);
            const m = Math.floor((r.t % 3600) / 60);
            const s = r.t % 60;
            html += `<tr><td>${i+1}º</td><td>#${r.n}</td><td>${r.v}</td><td>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    if (F.length > 0) {
        html += '<div class="report-section"><div class="report-section-title">FEMININO</div><table class="report-table"><thead><tr><th>POSIÇÃO</th><th>CORREDOR</th><th>VOLTA</th><th>TEMPO</th></tr></thead><tbody>';
        F.forEach((r, i) => {
            const h = Math.floor(r.t / 3600);
            const m = Math.floor((r.t % 3600) / 60);
            const s = r.t % 60;
            html += `<tr><td>${i+1}º</td><td>#${r.n}</td><td>${r.v}</td><td>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    document.getElementById('reportBody').innerHTML = html;
    document.getElementById('reportTime').textContent = new Date().toLocaleString('pt-BR');
    showScreen('Report');
});

document.getElementById('btnPrint').addEventListener('click', () => window.print());

function ensureXlsxLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }

        const existing = document.querySelector('script[data-xlsx="true"]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Falha ao carregar XLSX')));
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.full.min.js';
        script.async = true;
        script.setAttribute('data-xlsx', 'true');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar XLSX'));
        document.head.appendChild(script);
    });
}

function downloadCsv(M, F) {
    const header = 'POSIÇÃO;CORREDOR;TEMPO\n';
    const toLine = (r, i) => {
        const h = Math.floor(r.t / 3600);
        const m = Math.floor((r.t % 3600) / 60);
        const s = r.t % 60;
        return `${i + 1};${r.n};${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const csvM = M.map(toLine).join('\n');
    const csvF = F.map(toLine).join('\n');
    const csv = header + (M.length ? csvM : '') + (M.length && F.length ? '\n\n' : '') + (F.length ? csvF : '');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Corrida_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('✅ Arquivo CSV exportado (abra no Excel).');
}

function styleRow(ws, rowIndex, cols, style) {
    for (let c = 0; c < cols; c++) {
        const ref = XLSX.utils.encode_cell({ r: rowIndex, c });
        if (ws[ref]) ws[ref].s = style;
    }
}

function buildReportSheet(data, title, genderLabel) {
    const dateStr = new Date().toLocaleString('pt-BR');
    const aoa = [
        [title],
        [dateStr],
        ['GÊNERO', genderLabel],
        [''],
        ['POSIÇÃO', 'CORREDOR', 'TEMPO', 'GÊNERO']
    ];

    const rows = data.map((r, i) => {
        const timeValue = r.t / 86400; // dias
        return [
            i + 1,
            r.n,
            timeValue,
            genderLabel
        ];
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: -1 });

    const headerRow = 4;
    const startRow = 5;
    const endRow = startRow + rows.length - 1;

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
    ];

    ws['!cols'] = [
        { wch: 10 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 }
    ];

    const titleStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
        fill: { patternType: 'solid', fgColor: { rgb: '1F2937' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: 'DC2626' } },
            bottom: { style: 'thin', color: { rgb: 'DC2626' } },
            left: { style: 'thin', color: { rgb: 'DC2626' } },
            right: { style: 'thin', color: { rgb: 'DC2626' } }
        }
    };
    const subtitleStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { patternType: 'solid', fgColor: { rgb: '374151' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { patternType: 'solid', fgColor: { rgb: 'DC2626' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } }
        }
    };

    styleRow(ws, 0, 4, titleStyle);
    styleRow(ws, 1, 4, subtitleStyle);
    styleRow(ws, 2, 4, subtitleStyle);
    styleRow(ws, headerRow, 4, headerStyle);

    // Estilos para linhas de dados
    const evenRowStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } }
        }
    };
    const oddRowStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } }
        }
    };

    // Aplicar estilos zebrados nas linhas de dados
    for (let r = startRow; r <= endRow; r++) {
        const rowStyle = (r - startRow) % 2 === 0 ? evenRowStyle : oddRowStyle;
        styleRow(ws, r, 4, rowStyle);
    }

    for (let r = startRow; r <= endRow; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: 2 })];
        if (cell) cell.z = '[h]:mm:ss';
    }

    const headerCells = [0, 1, 2, 3].map(c => XLSX.utils.encode_cell({ r: headerRow, c }));
    headerCells.forEach(ref => {
        const cell = ws[ref];
        if (cell) cell.v = String(cell.v).toUpperCase();
    });

    return ws;
}

function buildGeneralSheet(M, F) {
    const dateStr = new Date().toLocaleString('pt-BR');
    const aoa = [
        ['RELATÓRIO FINAL - CRONOPLUS'],
        [dateStr],
        [''],
        ['POSIÇÃO', 'CORREDOR', 'TEMPO', 'GÊNERO']
    ];

    const all = [
        ...M.map(r => ({ ...r, gLabel: 'Masculino' })),
        ...F.map(r => ({ ...r, gLabel: 'Feminino' }))
    ].sort((a, b) => a.a - b.a);

    const rows = all.map((r, i) => {
        const timeValue = r.t / 86400;
        return [
            i + 1,
            r.n,
            timeValue,
            r.gLabel
        ];
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: -1 });

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
    ];
    ws['!cols'] = [
        { wch: 10 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 }
    ];

    const headerRow = 3;
    const startRow = 4;
    const endRow = startRow + rows.length - 1;
    for (let r = startRow; r <= endRow; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: 2 })];
        if (cell) cell.z = '[h]:mm:ss';
    }
    [0, 1, 2, 3].forEach(c => {
        const ref = XLSX.utils.encode_cell({ r: headerRow, c });
        if (ws[ref]) ws[ref].v = String(ws[ref].v).toUpperCase();
    });

    const titleStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
        fill: { patternType: 'solid', fgColor: { rgb: '1F2937' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: 'DC2626' } },
            bottom: { style: 'thin', color: { rgb: 'DC2626' } },
            left: { style: 'thin', color: { rgb: 'DC2626' } },
            right: { style: 'thin', color: { rgb: 'DC2626' } }
        }
    };
    const subtitleStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { patternType: 'solid', fgColor: { rgb: '374151' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { patternType: 'solid', fgColor: { rgb: 'DC2626' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } }
        }
    };

    styleRow(ws, 0, 4, titleStyle);
    styleRow(ws, 1, 4, subtitleStyle);
    styleRow(ws, headerRow, 4, headerStyle);

    // Estilos para linhas de dados
    const evenRowStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } }
        }
    };
    const oddRowStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } }
        }
    };

    // Aplicar estilos zebrados nas linhas de dados
    for (let r = startRow; r <= endRow; r++) {
        const rowStyle = (r - startRow) % 2 === 0 ? evenRowStyle : oddRowStyle;
        styleRow(ws, r, 4, rowStyle);
    }

    return ws;
}

document.getElementById('btnExcel').addEventListener('click', async () => {
    // Remover duplicatas: manter apenas o último registro de cada corredor
    const uniqueRunners = [];
    const runnerMap = new Map();
    
    state.runners.forEach(r => {
        const key = r.n + '_' + r.g;
        runnerMap.set(key, r);
    });
    
    runnerMap.forEach(r => uniqueRunners.push(r));
    
    const M = uniqueRunners.filter(r => r.g === 'M').sort((a, b) => a.a - b.a);
    const F = uniqueRunners.filter(r => r.g === 'F').sort((a, b) => a.a - b.a);

    if (M.length === 0 && F.length === 0) {
        alert('❌ Nenhum corredor para exportar.');
        return;
    }

    try {
        await ensureXlsxLoaded();
        if (typeof XLSX === 'undefined') {
            downloadCsv(M, F);
            return;
        }

        const wb = XLSX.utils.book_new();
        const wsGeral = buildGeneralSheet(M, F);
        XLSX.utils.book_append_sheet(wb, wsGeral, 'Geral');
        if (M.length > 0) {
            const wsM = buildReportSheet(M, 'RELATÓRIO FINAL - CRONOPLUS', 'Masculino');
            XLSX.utils.book_append_sheet(wb, wsM, 'Masculino');
        }
        if (F.length > 0) {
            const wsF = buildReportSheet(F, 'RELATÓRIO FINAL - CRONOPLUS', 'Feminino');
            XLSX.utils.book_append_sheet(wb, wsF, 'Feminino');
        }
        XLSX.writeFile(wb, `Corrida_${new Date().toISOString().split('T')[0]}.xlsx`);
        alert('✅ Planilha Excel exportada com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar:', error);
        try {
            downloadCsv(M, F);
        } catch (csvError) {
            console.error('Erro ao exportar CSV:', csvError);
            alert('❌ Erro ao exportar planilha. Tente novamente.');
        }
    }
});

document.getElementById('btnNew').addEventListener('click', () => {
    if (confirm('NOVA CORRIDA? Todos os dados serão APAGADOS!')) {
        localStorage.clear();
        state = { gender: null, runners: [], startTime: null, running: false, finished: false };
        location.reload();
    }
});

document.getElementById('btnReset').addEventListener('click', () => {
    if (confirm('RESETAR?')) {
        localStorage.clear();
        state = { gender: null, runners: [], startTime: null, running: false, finished: false };
        location.reload();
    }
});

// ============================================================================
// SINCRONIZAÇÃO MULTI-DISPOSITIVO
// ============================================================================

function generateQRCode() {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // Limpar anterior
    
    // Gerar URL com session ID
    const currentUrl = window.location.origin + window.location.pathname;
    const syncUrl = `${currentUrl}?sync=${state.sessionId}`;
    
    // Mostrar código de sessão
    document.getElementById('sessionCode').textContent = state.sessionId;
    
    // Gerar QR code
    new QRCode(qrContainer, {
        text: syncUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function openSyncModal() {
    generateQRCode();
    document.getElementById('modalQR').classList.add('active');
}

function closeQRModal() {
    document.getElementById('modalQR').classList.remove('active');
}

document.getElementById('btnSync').addEventListener('click', openSyncModal);

// Sincronizar com localStorage events (entre abas do mesmo navegador)
window.addEventListener('storage', (e) => {
    if (e.key === 'cronoplus_runners') {
        try {
            const remoteRunners = JSON.parse(e.newValue || '[]');
            // Mesclar runners sem perder locais
            remoteRunners.forEach(remoteRunner => {
                const exists = state.runners.find(r => r.n === remoteRunner.n && r.g === remoteRunner.g);
                if (!exists) {
                    state.runners.push(remoteRunner);
                }
            });
            save();
            updateScoreboard();
            showMessage('🔄 Dados sincronizados de outro dispositivo!', 'info');
        } catch (e) {
            console.log('Erro ao sincronizar:', e);
        }
    }
});

// Checar se veio de QR code (sync)
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const syncId = params.get('sync');
    if (syncId) {
        enableSyncMode(syncId, 'client');
        showMessage('🔗 Sincronização conectada. Atualizando dados...', 'info');
        loadRemoteState();
    }
});

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

function updateDisplay() {
    const badge = document.getElementById('genderBadge');
    const genderText = state.gender === 'M' ? 'Masculino' : 'Feminino';
    badge.textContent = genderText;
    badge.className = 'gender-badge ' + (state.gender === 'M' ? 'masculine' : 'feminine');
    document.getElementById('scoreboardGender').textContent = genderText;
    
    const btn = document.getElementById('btnStart');
    if (state.running) {
        btn.disabled = true;
        btn.textContent = '⏹️ Rodando';
        document.getElementById('chronoMsg').textContent = '⏱️ Cronômetro em andamento...';
    } else if (state.startTime) {
        btn.disabled = true;
        btn.textContent = '✓ Iniciado';
        document.getElementById('chronoMsg').textContent = '✓ Cronômetro já iniciado';
    } else {
        btn.disabled = false;
        btn.textContent = '▶ Iniciar Cronômetro';
        document.getElementById('chronoMsg').textContent = 'Cronômetro parado';
    }
}

if (state.finished) {
    showScreen('Report');
} else if (state.gender) {
    showScreen('Main');
    updateDisplay();
    updateScoreboard();
    if (state.running) {
        startChrono();
    } else if (state.startTime) {
        const elapsed = Math.floor((new Date().getTime() - parseInt(state.startTime)) / 1000);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        document.getElementById('chronometerDisplay').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
} else {
    showScreen('SexSelection');
}

if (window.location.pathname.includes('CRONOPLUS')) {
    state.syncEnabled = true;
    scheduleSyncPull();
}

// Fechar modals com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(m => m.classList.remove('active'));
        closeEditModal();
        closeQRModal();
    }
});

// Fechar modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Salvar backup a cada 2 segundos
setInterval(() => {
    if (state.runners.length > 0) save();
}, 2000);

window.addEventListener('beforeunload', (e) => {
    if (state.runners.length > 0 && !state.finished) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log('✅ CRONOPLUS pronto!', state);
