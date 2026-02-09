console.log('🚀 CRONOPLUS v2 iniciando...');

// ============================================================================
// ESTADO
// ============================================================================

let state = {
    gender: localStorage.getItem('gender') || null,
    runners: JSON.parse(localStorage.getItem('runners') || '[]'),
    startTime: localStorage.getItem('startTime') || null,
    running: localStorage.getItem('running') === 'true',
    finished: localStorage.getItem('finished') === 'true',
    chronoInterval: null
};

function save() {
    localStorage.setItem('gender', state.gender || '');
    localStorage.setItem('runners', JSON.stringify(state.runners));
    localStorage.setItem('startTime', state.startTime || '');
    localStorage.setItem('running', state.running);
    localStorage.setItem('finished', state.finished);
    console.log('💾 Estado salvo');
}

// ============================================================================
// INTERFACE
// ============================================================================

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen' + name).classList.add('active');
    console.log('📺 Tela:', name);
}

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = 'registration-message ' + type;
    setTimeout(() => { msg.textContent = ''; msg.className = 'registration-message'; }, 3000);
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
    if (state.finished) { showMessage('❌ Corrida finalizada!', 'error'); return; }
    if (!state.running) { showMessage('❌ Inicie cronômetro!', 'error'); return; }
    
    const input = document.getElementById('runnerNumber');
    const num = input.value.trim();
    
    if (!num) { showMessage('❌ Insira número!', 'error'); return; }
    if (isNaN(num) || num <= 0) { showMessage('❌ Número inválido!', 'error'); return; }
    
    if (state.runners.find(r => r.n == num && r.g === state.gender)) {
        showMessage('⚠️ Já registrado!', 'error');
        input.value = '';
        input.focus();
        return;
    }
    
    const elapsed = Math.floor((new Date().getTime() - parseInt(state.startTime)) / 1000);
    state.runners.push({ n: parseInt(num), g: state.gender, t: elapsed, a: new Date().getTime() });
    save();
    
    showMessage(`✅ Corredor #${num} registrado!`, 'success');
    input.value = '';
    input.focus();
    updateScoreboard();
}

// ============================================================================
// PLACAR
// ============================================================================

function updateScoreboard() {
    const runners = state.runners.filter(r => r.g === state.gender).sort((a, b) => a.a - b.a);
    const html = runners.length === 0 ? '<div class="empty-state">Aguardando...</div>' :
        runners.map((r, i) => {
            const h = Math.floor(r.t / 3600);
            const m = Math.floor((r.t % 3600) / 60);
            const s = r.t % 60;
            return `
            <div class="runner-row">
                <div class="runner-position">${i + 1}º</div>
                <div class="runner-number">#${r.n}</div>
                <div class="runner-time">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</div>
            </div>`;
        }).join('');
    document.getElementById('scoreboard').innerHTML = html;
    const countEl = document.getElementById('runnerCount');
    if (countEl) countEl.textContent = String(runners.length);
}

// ============================================================================
// RELATÓRIO
// ============================================================================

document.getElementById('btnReport').addEventListener('click', () => {
    if (state.runners.length === 0) { showMessage('❌ Nenhum corredor!', 'error'); return; }
    state.finished = true;
    save();
    if (state.chronoInterval) clearInterval(state.chronoInterval);
    
    const M = state.runners.filter(r => r.g === 'M').sort((a, b) => a.a - b.a);
    const F = state.runners.filter(r => r.g === 'F').sort((a, b) => a.a - b.a);
    
    let html = '';
    if (M.length > 0) {
        html += '<div class="report-section"><div class="report-section-title">MASCULINO</div><table class="report-table"><thead><tr><th>POSIÇÃO</th><th>CORREDOR</th><th>TEMPO</th></tr></thead><tbody>';
        M.forEach((r, i) => {
            const h = Math.floor(r.t / 3600);
            const m = Math.floor((r.t % 3600) / 60);
            const s = r.t % 60;
            html += `<tr><td>${i+1}º</td><td>#${r.n}</td><td>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    if (F.length > 0) {
        html += '<div class="report-section"><div class="report-section-title">FEMININO</div><table class="report-table"><thead><tr><th>POSIÇÃO</th><th>CORREDOR</th><th>TEMPO</th></tr></thead><tbody>';
        F.forEach((r, i) => {
            const h = Math.floor(r.t / 3600);
            const m = Math.floor((r.t % 3600) / 60);
            const s = r.t % 60;
            html += `<tr><td>${i+1}º</td><td>#${r.n}</td><td>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</td></tr>`;
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
    const M = state.runners.filter(r => r.g === 'M').sort((a, b) => a.a - b.a);
    const F = state.runners.filter(r => r.g === 'F').sort((a, b) => a.a - b.a);

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
