function render() {
  if (!S.mode) { renderModeSelect(); return; }
  if (S.generating) { renderGenerating(); return; }
  if (S.generated) { renderOutput(); return; }
  renderWizard();
}

function setTab(t) {
  S.activeTab = t;
  render();
  window.scrollTo(0, 0);
}

function renderOutput() {
  const g = S.generated;
  const isA = g.mode === 'adlc';
  const isD = g.mode === 'desktop';
  const isW = g.mode === 'website';
  const tabs = isA ? ['builder', 'structure', 'code', 'plan', 'prompts'] : ['builder', 'structure', 'stack', 'prd', 'prompts'];
  const labels = isA ? ['Live Builder', 'Struktur Folder', 'Starter Code', 'Master Plan', 'System Prompts'] : ['Live Builder', 'Struktur Folder', 'Tech Stack', 'PRD', 'AI Prompts'];
  const at = S.activeTab || tabs[0];
  const gClass = isA ? 'green' : isW ? 'pink' : isD ? 'amber' : '';

  const heroMeta = isA
    ? [g.llm || 'Claude', g.orch, g.complexity]
    : isD ? [g.fw, g.db, g.targetOS, g.scale]
    : [g.fe, g.db, g.scale];

  const heroLabel = isA ? 'Agentic AI - Generated' : isW ? 'Website - Generated' : isD ? 'Desktop App - Generated' : 'Software - Generated';

  let panel = '';
  if (at === 'builder') {
    panel = renderBuilderPanel();
  } else if (at === 'structure') {
    panel = `<div class="out-section">
      <div class="out-sec-head"><div class="out-sec-icon ${gClass}">DIR</div><div>
        <div class="out-sec-title">Struktur Folder Project</div>
        <div class="out-sec-sub">Komentar menjelaskan fungsi setiap folder</div>
      </div></div>
      <div class="code-block"><div class="code-header"><span class="code-lang-tag">Directory Tree</span>
        <button class="copy-btn" onclick="cpCode('sc1',this)">Salin</button></div>
        <pre id="sc1">${esc(g.structure.trim())}</pre></div>
    </div>`;
  } else if (at === 'stack' && !isA) {
    const phaseNumClass = isW ? 'pink' : isD ? 'amber' : '';
    const phaseTagClass = isW ? 'pink' : isD ? 'amber' : '';
    panel = `<div class="out-section">
      <div class="out-sec-head"><div class="out-sec-icon ${gClass}">CFG</div><div>
        <div class="out-sec-title">Rekomendasi Tech Stack</div>
        <div class="out-sec-sub">Dipilih otomatis berdasarkan jawaban kamu</div>
      </div></div>
      <div class="stack-recs">${(g.stackRecs || []).map(s => `
        <div class="stack-rec">
          <div class="stack-rec-star">${s.star}</div>
          <div class="stack-rec-cat">${s.cat}</div>
          <div class="stack-rec-name">${s.name}</div>
          <div class="stack-rec-why">${s.why}</div>
        </div>`).join('')}</div>
    </div>
    <div class="out-section" style="margin-top:10px">
      <div class="out-sec-head"><div class="out-sec-icon ${gClass}">PLAN</div><div>
        <div class="out-sec-title">Fase Pengerjaan</div>
        <div class="out-sec-sub">Urutan yang disarankan</div>
      </div></div>
      <div class="phase-list">${(g.phases || []).map(p => `
        <div class="phase-item">
          <div class="phase-num ${phaseNumClass}">${p.num}</div>
          <div><div class="phase-title">${p.title}</div>
            <div class="phase-desc">${p.desc}</div>
            <div class="phase-tags">${p.tags.map(t => `<span class="phase-tag ${phaseTagClass}">${t}</span>`).join('')}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  } else if (at === 'code' && isA) {
    panel = `<div class="out-section">
      <div class="out-sec-head"><div class="out-sec-icon green">PY</div><div>
        <div class="out-sec-title">Starter Code - Python Agent</div>
        <div class="out-sec-sub">Siap dijalankan, tinggal isi bagian TODO</div>
      </div></div>
      <div class="code-block"><div class="code-header"><span class="code-lang-tag">Python</span>
        <button class="copy-btn" onclick="cpCode('sc2',this)">Salin</button></div>
        <pre id="sc2">${esc(g.starterCode.trim())}</pre></div>
    </div>`;
  } else if (at === 'plan' && isA) {
    panel = `<div class="out-section">
      <div class="out-sec-head"><div class="out-sec-icon green">DOC</div><div>
        <div class="out-sec-title">ADLC Master Plan</div>
        <div class="out-sec-sub">Roadmap lengkap - tinggal isi bagian kosong</div>
      </div></div>
      <div class="code-block"><div class="code-header"><span class="code-lang-tag">Markdown</span>
        <button class="copy-btn" onclick="cpCode('sc3',this)">Salin</button></div>
        <pre id="sc3">${esc(g.masterPlan.trim())}</pre></div>
    </div>`;
  } else if (at === 'prd' && !isA) {
    panel = `<div class="out-section">
      <div class="out-sec-head"><div class="out-sec-icon ${gClass}">PRD</div><div>
        <div class="out-sec-title">${isD ? 'PRD - Desktop App' : 'PRD - Product Requirements Document'}</div>
        <div class="out-sec-sub">Tinggal isi bagian dalam [kurung kotak]</div>
      </div></div>
      <div class="code-block"><div class="code-header"><span class="code-lang-tag">Markdown</span>
        <button class="copy-btn" onclick="cpCode('sc4',this)">Salin</button></div>
        <pre id="sc4">${esc(g.prd.trim())}</pre></div>
    </div>`;
  } else if (at === 'prompts') {
    const content = isA ? g.sysPrompts : g.prompts;
    panel = `<div class="out-section">
      <div class="out-sec-head"><div class="out-sec-icon ${gClass}">AI</div><div>
        <div class="out-sec-title">${isA ? 'System Prompt Templates' : isD ? 'Starter Prompts Desktop App' : 'Starter Prompts untuk AI Coding'}</div>
        <div class="out-sec-sub">${isA ? '4 template siap pakai - copy & paste ke project kamu' : 'Prompt siap pakai - gunakan dengan Claude Code, Cursor, atau ChatGPT'}</div>
      </div></div>
      <div class="code-block"><div class="code-header"><span class="code-lang-tag">Prompts</span>
        <button class="copy-btn" onclick="cpCode('sc5',this)">Salin</button></div>
        <pre id="sc5">${esc(content.trim())}</pre></div>
    </div>`;
  }

  R.innerHTML = `
  <div class="out-wrap">
    <div class="out-hero ${gClass}">
      <div class="out-hero-label">${heroLabel}</div>
      <div class="out-hero-name">${g.name}</div>
      <div class="out-hero-meta">${heroMeta.filter(Boolean).map(m => `<span class="out-hero-chip">${m}</span>`).join('')}</div>
    </div>
    <div class="tab-nav">${tabs.map((t, i) => `<button class="tab-nav-btn ${at === t ? 'active' : ''}" data-output-action="set-tab" data-tab="${esc(t)}">${labels[i]}</button>`).join('')}</div>
    <div id="out-panel">${panel}</div>
    <div class="restart-row">
      <button class="btn btn-next" style="margin-bottom:10px;width:100%;justify-content:center;display:flex" data-output-action="download-bundle" type="button">Download Project Bundle (masterplan + semua fase)</button>
      <button class="btn btn-back" style="margin-bottom:15px;width:100%;justify-content:center;display:flex" data-output-action="download-masterplan" type="button">Hanya masterplan.md</button>
      <button class="btn btn-restart" data-output-action="restart-project" type="button">Kembali ke Project Baru</button>
    </div>
  </div>`;
}

function buildCompactMasterplanContent() {
  const g = S.generated;
  if (!g) return '';
  const modeLabel = g.mode === 'adlc' ? 'Agentic AI System' : g.mode === 'website' ? 'Website / Landing Page' : g.mode === 'desktop' ? 'Desktop App' : 'Software Application';
  const sections = [
    `# Masterplan - ${g.name}`,
    '',
    `- Mode: ${modeLabel}`,
    `- Generated: ${new Date().toLocaleString()}`,
    '',
    '## Project Summary',
    normalizeBundleText(S.answers.projectName || g.name, { maxLines: 18, maxChars: 1200 }),
    '',
    '## Recommended Stack',
    normalizeBundleText(g.prd || g.masterPlan || '', { maxLines: 80, maxChars: 5000 }),
    '',
    '## Folder Structure',
    '```text',
    normalizeBundleText(g.structure || '', { maxLines: 120, maxChars: 4000 }),
    '```',
    '',
    '## Prompt Notes',
    normalizeBundleText(g.prompts || g.sysPrompts || '', { maxLines: 80, maxChars: 4500 })
  ];
  return sections.join('\n').trim();
}

function dlMasterplan() {
  const content = buildCompactMasterplanContent();
  if (!content) return;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'masterplan.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function dlProjectBundle() {
  const g = S.generated;
  if (!g || typeof JSZip === 'undefined') {
    alert('JSZip belum termuat. Coba hard-refresh halaman (Shift+F5) dan pastikan koneksi internet aktif.');
    return;
  }

  const zip = new JSZip();
  const root = zip.folder(slug(g.name));
  const compactMasterplan = buildCompactMasterplanContent();
  const compactGuide = normalizeBundleText(g.prompts || g.sysPrompts || '', { maxLines: 120, maxChars: 7000 });
  const compactPrd = normalizeBundleText(g.prd || g.masterPlan || '', { maxLines: 180, maxChars: 11000 });
  const compactStructure = normalizeBundleText(g.structure || '', { maxLines: 220, maxChars: 9000 });
  const taskPlan = createTaskPlanFromWorkspace().md;

  const docs = [
    ...splitMarkdownIntoChunks('masterplan', compactMasterplan, { chunkSize: 5000 }),
    ...splitMarkdownIntoChunks('prd', compactPrd, { chunkSize: 5000 }),
    ...splitMarkdownIntoChunks('ai_guide', compactGuide, { chunkSize: 5000 }),
    ...splitMarkdownIntoChunks('structure', `# Structure\n\n\`\`\`text\n${compactStructure}\n\`\`\``, { chunkSize: 5000 }),
    { name: 'task_plan.md', content: taskPlan }
  ];

  const index = formatBundleIndex([
    { name: 'masterplan.md / masterplan.partXX.md', description: 'Ringkasan utama project dan aturan kerja AI.' },
    { name: 'prd.md / prd.partXX.md', description: 'PRD atau master plan yang sudah dipadatkan.' },
    { name: 'ai_guide.md / ai_guide.partXX.md', description: 'Prompt dan panduan penggunaan AI IDE.' },
    { name: 'structure.md', description: 'Struktur folder project.' },
    { name: 'task_plan.md', description: 'Rencana eksekusi bertahap untuk AI IDE.' }
  ]);

  const bundleEntries = [{ name: 'README_BUNDLE.md', content: index }, ...docs];
  const validation = validateBundleEntries(bundleEntries);

  root.file('README_BUNDLE.md', index);
  docs.forEach(doc => root.file(doc.name, doc.content));
  root.file('BUNDLE_VALIDATION.md', validation.md);
  refreshBuildMeta({
    bundleValidationSummary: validation.summary,
    lastReason: 'bundle-validation'
  });
  addBuildLog(validation.summary, validation.warnings.length ? 'amber' : 'success');

  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${slug(g.name)}-bundle.zip`;
  link.click();
}

function getOutputEventTarget(event, selector) {
  const target = event?.target;
  if (target && typeof target.closest === 'function') {
    return target.closest(selector);
  }
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (node && typeof node.closest === 'function') {
      return node.closest(selector);
    }
  }
  return null;
}

function installOutputActionBindings() {
  if (window.__outputActionBindingsInstalled) return;
  window.__outputActionBindingsInstalled = true;

  const handler = (event) => {
    const trigger = getOutputEventTarget(event, '[data-output-action]');
    if (!trigger) return;

    const action = trigger.getAttribute('data-output-action');
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();

    if (action === 'set-tab') {
      const tab = trigger.getAttribute('data-tab');
      if (tab) setTab(tab);
      return;
    }

    if (action === 'download-bundle') {
      dlProjectBundle();
      return;
    }

    if (action === 'download-masterplan') {
      dlMasterplan();
      return;
    }

    if (action === 'restart-project') {
      restart();
    }
  };

  document.addEventListener('click', handler, true);
  document.addEventListener('pointerup', handler, true);
}

window.setTab = setTab;
window.dlMasterplan = dlMasterplan;
window.dlProjectBundle = dlProjectBundle;
installOutputActionBindings();
