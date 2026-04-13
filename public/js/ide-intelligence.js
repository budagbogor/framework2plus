function defaultBuildMeta(){
    return {
        phase: 'idle',
        summary: 'Belum ada build aktif.',
        currentGoal: 'Mulai autonomous build untuk membuat project nyata.',
        remainingTasks: [],
        criticalFiles: [],
        missingCriticalFiles: [],
        checklistDone: 0,
        checklistTotal: 0,
        fileCount: 0,
        lastChangedFiles: [],
        doctorFindings: [],
        projectBrainSummary: '',
        projectBrainRisks: [],
        bundleValidationSummary: '',
        lastReason: 'idle',
        lastUpdated: null
    };
}

function getNativeProjectRoot(){
    const projectName = S.generated?.name ? slug(S.generated.name) : '';
    return projectName ? `${S.workspacePath}/${projectName}` : S.workspacePath;
}

function normalizeList(value){
    if(Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
    if(typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
}

function workspaceHasPattern(paths, patterns){
    return patterns.some((pattern) => paths.some((p) => pattern.test(p)));
}

function inferRequiredWorkspaceSignals(paths){
    const signals = [
        { label: 'README.md', present: paths.includes('README.md') },
        { label: '.gitignore', present: paths.includes('.gitignore') }
    ];

    if (S.mode === 'website') {
        signals.push({
            label: 'entry HTML',
            present: workspaceHasPattern(paths, [/^index\.html$/i, /^public\/index\.html$/i, /^src\/index\.html$/i, /\.html$/i])
        });
    } else {
        signals.push({
            label: 'package.json',
            present: paths.includes('package.json')
        });
        signals.push({
            label: 'app entry',
            present: workspaceHasPattern(paths, [
                /^src\/main\.(js|jsx|ts|tsx)$/i,
                /^src\/app\.(js|jsx|ts|tsx)$/i,
                /^app\/page\.(js|jsx|ts|tsx)$/i,
                /^pages\/index\.(js|jsx|ts|tsx)$/i,
                /^src\/index\.html$/i,
                /^index\.html$/i
            ])
        });
    }

    return signals;
}

function parseMasterplanChecklist(markdown){
    const lines = String(markdown || '').split(/\r?\n/);
    const checklist = lines.filter(line => /^\s*[-*]\s+\[(?: |x|X)\]/.test(line));
    const done = checklist.filter(line => /^\s*[-*]\s+\[(?:x|X)\]/.test(line)).length;
    return { total: checklist.length, done };
}

function syncBuildStatusArtifact(){
    const payload = {
        project: S.generated?.name || 'unnamed-project',
        mode: S.mode || 'unknown',
        phase: S.buildMeta.phase,
        summary: S.buildMeta.summary,
        currentGoal: S.buildMeta.currentGoal,
        remainingTasks: S.buildMeta.remainingTasks,
        criticalFiles: S.buildMeta.criticalFiles,
        missingCriticalFiles: S.buildMeta.missingCriticalFiles,
        checklist: {
            done: S.buildMeta.checklistDone,
            total: S.buildMeta.checklistTotal
        },
        fileCount: S.buildMeta.fileCount,
        lastChangedFiles: S.buildMeta.lastChangedFiles,
        doctorFindings: S.buildMeta.doctorFindings,
        projectBrainSummary: S.buildMeta.projectBrainSummary,
        projectBrainRisks: S.buildMeta.projectBrainRisks,
        bundleValidationSummary: S.buildMeta.bundleValidationSummary,
        queue: Array.isArray(S.buildQueue) ? S.buildQueue.map(step => ({
            key: step.key,
            label: step.label,
            status: step.status
        })) : [],
        lastReason: S.buildMeta.lastReason,
        lastUpdated: S.buildMeta.lastUpdated
    };
    S.virtualWorkspace['BUILD_STATUS.json'] = JSON.stringify(payload, null, 2);
    if (S.isNative && invoke) {
        invoke('save_file', { path: `${getNativeProjectRoot()}/BUILD_STATUS.json`, content: S.virtualWorkspace['BUILD_STATUS.json'] });
    }
}

function refreshBuildMeta(patch = {}){
    const persistedFiles = Object.keys(S.virtualWorkspace || {}).filter(path => path !== 'BUILD_STATUS.json');
    const inferredSignals = inferRequiredWorkspaceSignals(persistedFiles);
    const inferredCritical = inferredSignals.map(item => item.label);
    const inferredMissing = inferredSignals.filter(item => !item.present).map(item => item.label);
    const checklist = parseMasterplanChecklist(S.virtualWorkspace['MASTERPLAN.md']);

    S.buildMeta = Object.assign(defaultBuildMeta(), S.buildMeta, patch, {
        criticalFiles: Array.from(new Set([...inferredCritical, ...normalizeList(patch.criticalFiles || S.buildMeta.criticalFiles)])),
        missingCriticalFiles: inferredMissing,
        remainingTasks: normalizeList(patch.remainingTasks || S.buildMeta.remainingTasks),
        fileCount: persistedFiles.length,
        lastChangedFiles: normalizeList(patch.lastChangedFiles || S.buildMeta.lastChangedFiles),
        doctorFindings: normalizeList(patch.doctorFindings || S.buildMeta.doctorFindings),
        projectBrainRisks: normalizeList(patch.projectBrainRisks || S.buildMeta.projectBrainRisks),
        bundleValidationSummary: patch.bundleValidationSummary || S.buildMeta.bundleValidationSummary || '',
        checklistDone: checklist.done,
        checklistTotal: checklist.total,
        lastUpdated: new Date().toLocaleString(),
        lastReason: patch.lastReason || S.buildMeta.lastReason || 'workspace-update'
    });

    if (!S.buildMeta.summary) {
        S.buildMeta.summary = persistedFiles.length > 0
            ? `Workspace berisi ${persistedFiles.length} file.`
            : 'Workspace belum memiliki file build.';
    }

    syncBuildStatusArtifact();
    saveWorkspaceToLocal();
}

function safeJsonParse(text, fallback = null){
    try { return JSON.parse(text); } catch(e) { return fallback; }
}

function getWorkspaceFileEntries(){
    return Object.entries(S.virtualWorkspace || {}).filter(([path]) => path !== 'BUILD_STATUS.json');
}

function getWorkspacePaths(){
    return getWorkspaceFileEntries().map(([path]) => path);
}

function readWorkspaceJson(path){
    const content = S.virtualWorkspace?.[path];
    return content ? safeJsonParse(content, null) : null;
}

function getLastWorkspaceDiff(){
    const diff = readWorkspaceJson('CHANGES_LAST_STEP.json');
    return diff || {
        created: [],
        updated: [],
        deleted: [],
        touched: [],
        details: []
    };
}

function buildDiffPreview(beforeContent, afterContent){
    const beforeLines = String(beforeContent || '').split(/\r?\n/);
    const afterLines = String(afterContent || '').split(/\r?\n/);
    const added = afterLines.filter(line => !beforeLines.includes(line)).slice(0, 4);
    const removed = beforeLines.filter(line => !afterLines.includes(line)).slice(0, 4);
    return {
        beforeLines: beforeLines.length,
        afterLines: afterLines.length,
        addedPreview: added,
        removedPreview: removed
    };
}

function detectWorkspaceRuntime(){
    const pkg = readWorkspaceJson('package.json');
    const deps = Object.assign({}, pkg?.dependencies || {}, pkg?.devDependencies || {});
    const scripts = pkg?.scripts || {};
    const paths = getWorkspacePaths();

    let projectType = 'static';
    if (deps.next || paths.some(p => /^app\/page\.(js|jsx|ts|tsx)$/i.test(p))) projectType = 'nextjs';
    else if (deps.react || deps.vue || deps.svelte || deps['@angular/core']) projectType = 'spa';
    else if (paths.some(p => p.endsWith('.html'))) projectType = 'static';

    let packageManager = 'npm';
    if (S.virtualWorkspace['pnpm-lock.yaml']) packageManager = 'pnpm';
    else if (S.virtualWorkspace['yarn.lock']) packageManager = 'yarn';
    else if (S.virtualWorkspace['bun.lockb'] || S.virtualWorkspace['bun.lock']) packageManager = 'bun';

    const installCommand = packageManager === 'pnpm'
        ? 'pnpm install'
        : packageManager === 'yarn'
            ? 'yarn install'
            : packageManager === 'bun'
                ? 'bun install'
                : 'npm install';

    let devCommand = '';
    if (scripts.dev) {
        devCommand = packageManager === 'yarn' ? 'yarn dev' : `${packageManager} run dev`;
    } else if (scripts.start) {
        devCommand = packageManager === 'yarn' ? 'yarn start' : `${packageManager} run start`;
    } else if (projectType === 'static') {
        devCommand = 'static preview';
    }

    let buildCommand = '';
    if (scripts.build) buildCommand = packageManager === 'yarn' ? 'yarn build' : `${packageManager} run build`;

    let testCommand = '';
    if (scripts.test) testCommand = packageManager === 'yarn' ? 'yarn test' : `${packageManager} run test`;

    const hasTauri = !!readWorkspaceJson('src-tauri/tauri.conf.json') || paths.some(p => p.startsWith('src-tauri/'));
    let desktopBundleCommand = '';
    if (scripts['desktop:exe']) desktopBundleCommand = packageManager === 'yarn' ? 'yarn desktop:exe' : `${packageManager} run desktop:exe`;
    else if (scripts['desktop:build']) desktopBundleCommand = packageManager === 'yarn' ? 'yarn desktop:build' : `${packageManager} run desktop:build`;
    else if (scripts.tauri) desktopBundleCommand = packageManager === 'yarn' ? 'yarn tauri' : `${packageManager} run tauri`;

    return {
        packageManager,
        projectType,
        installCommand,
        devCommand,
        buildCommand,
        testCommand,
        desktopBundleCommand,
        scripts,
        hasPackageJson: !!pkg,
        hasTauri
    };
}

function parseCommandLine(commandLine){
    const value = String(commandLine || '').trim();
    if(!value) return null;
    const parts = value.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const clean = parts.map(part => part.replace(/^"|"$/g, ''));
    return clean.length ? { cmd: clean[0], args: clean.slice(1) } : null;
}

function getWorkspaceInsights(){
    const runtime = detectWorkspaceRuntime();
    const paths = getWorkspacePaths();
    const hasTests = paths.some(p => /test|spec|playwright|cypress/i.test(p)) || !!runtime.scripts.test;
    const hasEnvExample = paths.includes('.env.example');
    const hasReadme = paths.includes('README.md');
    const hasDocker = paths.includes('Dockerfile') || paths.includes('docker-compose.yml');
    const hasCi = paths.some(p => p.startsWith('.github/workflows/'));
    const hasTauri = runtime.hasTauri;
    const sourceFiles = paths.filter(p => /\.(js|jsx|ts|tsx|rs|py|html|css|json|md)$/i.test(p));

    let healthScore = 35;
    if (runtime.hasPackageJson || runtime.projectType === 'static') healthScore += 15;
    if (hasReadme) healthScore += 10;
    if (hasEnvExample) healthScore += 10;
    if (hasTests) healthScore += 10;
    if (hasDocker || hasCi) healthScore += 10;
    if (metaHasNoCriticalMissing()) healthScore += 10;

    return {
        runtime,
        fileCount: paths.length,
        sourceFileCount: sourceFiles.length,
        hasTests,
        hasEnvExample,
        hasReadme,
        hasDocker,
        hasCi,
        hasTauri,
        healthScore: Math.max(0, Math.min(100, healthScore))
    };
}

function metaHasNoCriticalMissing(){
    return !(S.buildMeta?.missingCriticalFiles || []).length;
}

function getSmartActionPresets(){
    const insights = getWorkspaceInsights();
    const runtime = insights.runtime;
    return [
        { key:'review', label:'AI Review', prompt:'Lakukan code review menyeluruh pada workspace ini. Fokus pada bug, missing dependency, broken import, security risk, dan regression risk. Berikan perbaikan file jika diperlukan.' },
        { key:'tests', label:'Tambah Test', prompt:`Tambahkan test yang paling penting untuk project ini. Gunakan stack testing yang sesuai dengan ${runtime.projectType} dan buat file test nyata.` },
        { key:'docs', label:'Rapikan Docs', prompt:'Perbarui README.md, .env.example, dan dokumentasi setup agar project ini mudah di-install, dijalankan, dan dipelihara.' },
        { key:'doctor', label:'Doctor Auto-Fix', prompt:'' },
        { key:'release', label:'Production Hardening', prompt:'Lakukan hardening production: cek konfigurasi build, environment, error handling, logging, dan deployment file yang masih kurang.' },
        { key:'brain', label:'Refresh Brain', prompt:'' }
    ];
}

function applySmartAction(actionKey){
    if(actionKey === 'doctor'){
        runProjectDoctorAutoFix();
        return;
    }
    if(actionKey === 'brain'){
        syncProjectBrainArtifacts();
        addBuildLog('Project Brain disegarkan dari workspace terbaru.', 'success');
        render();
        return;
    }
    const action = getSmartActionPresets().find(item => item.key === actionKey);
    if(!action) return;
    const input = document.getElementById('agentChatInput');
    if(input){
        input.value = action.prompt;
        input.focus();
    }
}

function getAgentProfilePresets(){
    return {
        architect: {
            label: 'Architect',
            guidance: 'Prioritaskan arsitektur, batas modul, kontrak data, dan strategi implementasi jangka panjang sebelum menulis banyak kode.'
        },
        builder: {
            label: 'Builder',
            guidance: 'Prioritaskan penyelesaian fitur end-to-end, file nyata, integrasi berjalan, dan hasil yang bisa dieksekusi.'
        },
        reviewer: {
            label: 'Reviewer',
            guidance: 'Prioritaskan deteksi bug, regresi, test gap, security issue, dan quality gate sebelum mengubah banyak file.'
        },
        release: {
            label: 'Release',
            guidance: 'Prioritaskan stabilitas production, packaging desktop, release checklist, observability, dan distribusi installer.'
        }
    };
}

function setAIProfile(profileKey){
    const presets = getAgentProfilePresets();
    if(!presets[profileKey]) return;
    S.aiProfile = profileKey;
    saveWorkspaceToLocal();
    render();
}

function createProjectBrain(){
    const insights = getWorkspaceInsights();
    const runtime = insights.runtime;
    const files = getWorkspacePaths();
    const masterplan = String(S.virtualWorkspace['MASTERPLAN.md'] || '');
    const checklist = parseMasterplanChecklist(masterplan);
    const topFiles = files.slice(0, 12);
    const risks = [];

    if (!insights.hasTests) risks.push('Test coverage belum terdeteksi.');
    if (!insights.hasReadme) risks.push('README belum tersedia.');
    if (!insights.hasEnvExample) risks.push('Environment example belum ada.');
    if (!(insights.hasCi || insights.hasDocker)) risks.push('Release pipeline infra belum lengkap.');
    if ((S.buildMeta?.missingCriticalFiles || []).length) risks.push(`File kritis masih hilang: ${S.buildMeta.missingCriticalFiles.join(', ')}`);
    if (!runtime.buildCommand && runtime.projectType !== 'static') risks.push('Build command belum terdeteksi.');
    if (!risks.length) risks.push('Tidak ada risiko mayor yang terdeteksi dari heuristik lokal.');

    const summary = [
        `Workspace bertipe ${runtime.projectType} dengan package manager ${runtime.packageManager}.`,
        `Checklist MASTERPLAN selesai ${checklist.done}/${checklist.total}.`,
        `Terdapat ${files.length} file dengan fokus utama pada ${topFiles.slice(0, 4).join(', ') || 'workspace bootstrap'}.`
    ].join(' ');

    return {
        generatedAt: new Date().toLocaleString(),
        profile: S.aiProfile || 'builder',
        projectType: runtime.projectType,
        packageManager: runtime.packageManager,
        summary,
        risks,
        topFiles,
        commands: {
            install: runtime.installCommand,
            dev: runtime.devCommand,
            build: runtime.buildCommand,
            test: runtime.testCommand,
            bundle: runtime.desktopBundleCommand
        }
    };
}

function syncProjectBrainArtifacts(){
    const brain = createProjectBrain();
    const brainMd = [
        '# DevForge Project Brain',
        '',
        `- Generated: ${brain.generatedAt}`,
        `- AI Profile: ${brain.profile}`,
        `- Project Type: ${brain.projectType}`,
        `- Package Manager: ${brain.packageManager}`,
        '',
        '## Summary',
        brain.summary,
        '',
        '## Risks',
        ...brain.risks.map(item => `- ${item}`),
        '',
        '## Top Files',
        ...brain.topFiles.map(item => `- ${item}`)
    ].join('\n');
    S.virtualWorkspace['PROJECT_BRAIN.json'] = JSON.stringify(brain, null, 2);
    S.virtualWorkspace['PROJECT_BRAIN.md'] = brainMd;
    if (S.isNative && invoke) {
        invoke('save_file', { path: `${getNativeProjectRoot()}/PROJECT_BRAIN.json`, content: S.virtualWorkspace['PROJECT_BRAIN.json'] });
        invoke('save_file', { path: `${getNativeProjectRoot()}/PROJECT_BRAIN.md`, content: brainMd });
    }
    refreshBuildMeta({
        projectBrainSummary: brain.summary,
        projectBrainRisks: brain.risks.slice(0, 5),
        lastReason: 'project-brain-sync'
    });
    return brain;
}

function collectAgentContext(){
    const insights = getWorkspaceInsights();
    const paths = getWorkspacePaths();
    const activeContent = S.activeFile ? (S.virtualWorkspace[S.activeFile] || '') : '';
    const recentLogs = (S.buildLogs || []).slice(-12).map(l => `[${l.time}] ${l.msg}`).join('\n');
    const recentChat = (S.chatHistory || []).slice(-6).map(item => `${item.role.toUpperCase()}: ${item.message}`).join('\n');
    const projectBrain = safeJsonParse(S.virtualWorkspace['PROJECT_BRAIN.json'], null) || syncProjectBrainArtifacts();
    return {
        insights,
        workspaceFiles: paths,
        activeFile: S.activeFile || '',
        activeContent: activeContent.slice(0, 12000),
        masterplan: (S.virtualWorkspace['MASTERPLAN.md'] || '').slice(0, 16000),
        buildStatus: S.virtualWorkspace['BUILD_STATUS.json'] || '',
        projectBrain,
        recentLogs,
        recentChat
    };
}

function diffWorkspaceFiles(beforeMap, afterMap){
    const beforeKeys = Object.keys(beforeMap || {});
    const afterKeys = Object.keys(afterMap || {}).filter(path => path !== 'BUILD_STATUS.json' && path !== 'DOCTOR_REPORT.md' && path !== 'CHANGES_LAST_STEP.json');
    const created = afterKeys.filter(path => !(path in (beforeMap || {})));
    const updated = afterKeys.filter(path => (path in (beforeMap || {})) && beforeMap[path] !== afterMap[path]);
    const deleted = beforeKeys.filter(path => !(path in (afterMap || {})));
    const details = [
        ...created.map(path => {
            const preview = buildDiffPreview('', afterMap[path]);
            return {
                path,
                type: 'created',
                beforeLines: 0,
                afterLines: preview.afterLines,
                deltaLines: preview.afterLines,
                addedPreview: preview.addedPreview,
                removedPreview: []
            };
        }),
        ...updated.map(path => {
            const preview = buildDiffPreview(beforeMap[path], afterMap[path]);
            return {
                path,
                type: 'updated',
                beforeLines: preview.beforeLines,
                afterLines: preview.afterLines,
                deltaLines: preview.afterLines - preview.beforeLines,
                addedPreview: preview.addedPreview,
                removedPreview: preview.removedPreview
            };
        }),
        ...deleted.map(path => {
            const preview = buildDiffPreview(beforeMap[path], '');
            return {
                path,
                type: 'deleted',
                beforeLines: preview.beforeLines,
                afterLines: 0,
                deltaLines: -preview.beforeLines,
                addedPreview: [],
                removedPreview: preview.removedPreview.length ? preview.removedPreview : String(beforeMap[path] || '').split(/\r?\n/).slice(0, 4)
            };
        })
    ];
    return { created, updated, deleted, touched: [...created, ...updated], details };
}

function createDoctorReport(){
    const insights = getWorkspaceInsights();
    const findings = [];

    if ((S.buildMeta?.missingCriticalFiles || []).length) findings.push(`Critical files missing: ${S.buildMeta.missingCriticalFiles.join(', ')}`);
    if (!insights.hasTests) findings.push('Belum ada tests yang terdeteksi.');
    if (!insights.hasEnvExample) findings.push('Belum ada .env.example untuk setup environment.');
    if (!insights.hasReadme) findings.push('README.md belum tersedia atau belum terdeteksi.');
    if (!(insights.hasCi || insights.hasDocker)) findings.push('Belum ada CI workflow atau Dockerfile untuk release pipeline.');
    if (!insights.runtime.devCommand) findings.push('Dev command belum terdeteksi otomatis.');
    if (!insights.runtime.buildCommand && insights.runtime.projectType !== 'static') findings.push('Build command belum terdeteksi otomatis.');
    if (insights.healthScore >= 80 && findings.length === 0) findings.push('Workspace dalam kondisi sehat untuk melanjutkan development.');

    return {
        healthScore: insights.healthScore,
        runtime: insights.runtime,
        findings,
        generatedAt: new Date().toLocaleString()
    };
}

function syncDoctorArtifacts(){
    const report = createDoctorReport();
    const reportMd = [
        '# DevForge Project Doctor',
        '',
        `- Generated: ${report.generatedAt}`,
        `- Health Score: ${report.healthScore}/100`,
        `- Project Type: ${report.runtime.projectType}`,
        `- Package Manager: ${report.runtime.packageManager}`,
        '',
        '## Findings',
        ...report.findings.map(item => `- ${item}`)
    ].join('\n');
    S.virtualWorkspace['DOCTOR_REPORT.md'] = reportMd;
    if (S.isNative && invoke) {
        invoke('save_file', { path: `${getNativeProjectRoot()}/DOCTOR_REPORT.md`, content: reportMd });
    }
    refreshBuildMeta({
        doctorFindings: report.findings.slice(0, 6)
    });
}

function saveVirtualFile(path, content){
    S.virtualWorkspace[path] = content;
    if (S.isNative && invoke) {
        invoke('save_file', { path: `${getNativeProjectRoot()}/${path}`, content });
    }
}

function scanEnvKeys(){
    const keys = new Set();
    for (const [, content] of getWorkspaceFileEntries()) {
        const text = String(content || '');
        [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].forEach(match => keys.add(match[1]));
        [...text.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)].forEach(match => keys.add(match[1]));
    }
    return Array.from(keys).sort();
}

function buildGeneratedReadme(){
    const insights = getWorkspaceInsights();
    const runtime = insights.runtime;
    const projectName = S.generated?.name || 'DevForge Project';
    const envKeys = scanEnvKeys();
    const envSection = envKeys.length
        ? ['## Environment Variables', '', ...envKeys.map(key => `- \`${key}\``), ''].join('\n')
        : '';
    return [
        `# ${projectName}`,
        '',
        'Generated and refined with DevForge Studio autonomous builder.',
        '',
        '## Stack Summary',
        '',
        `- Project Type: ${runtime.projectType}`,
        `- Package Manager: ${runtime.packageManager}`,
        `- Install: ${runtime.installCommand || 'n/a'}`,
        `- Dev: ${runtime.devCommand || 'n/a'}`,
        `- Build: ${runtime.buildCommand || 'n/a'}`,
        `- Test: ${runtime.testCommand || 'n/a'}`,
        '',
        '## Quick Start',
        '',
        '```bash',
        runtime.installCommand || 'npm install',
        runtime.devCommand || 'npm run dev',
        '```',
        '',
        envSection,
        '## Notes',
        '',
        '- Check `DOCTOR_REPORT.md` for project health diagnostics.',
        '- Check `BUILD_STATUS.json` for the latest autonomous build state.',
        '- Check `CHANGES_LAST_STEP.json` for the latest file diff summary.'
    ].filter(Boolean).join('\n');
}

function buildGeneratedGitignore(){
    const insights = getWorkspaceInsights();
    const lines = [
        'node_modules/',
        'dist/',
        'build/',
        '.env',
        '.env.local',
        '.DS_Store',
        '*.log',
        '.turbo/',
        '.cache/'
    ];
    if (insights.hasTauri) {
        lines.push('src-tauri/target/', 'src-tauri/gen/');
    }
    return Array.from(new Set(lines)).join('\n') + '\n';
}

function normalizeBundleText(value, options = {}) {
    const maxLines = options.maxLines || 220;
    const maxChars = options.maxChars || 14000;
    let text = String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '  ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    text = text.split('\n').slice(0, maxLines).join('\n');
    if (text.length > maxChars) {
        text = `${text.slice(0, maxChars).trim()}\n\n[... konten dipotong otomatis agar tetap stabil diproses AI IDE ...]`;
    }
    return text;
}

function splitMarkdownIntoChunks(title, content, options = {}) {
    const chunkSize = options.chunkSize || 5500;
    const normalized = normalizeBundleText(content, {
        maxLines: options.maxLines || 480,
        maxChars: options.maxChars || 30000
    });
    if (normalized.length <= chunkSize) {
        return [{ name: `${title}.md`, content: normalized }];
    }
    const parts = [];
    let cursor = 0;
    let index = 1;
    while (cursor < normalized.length) {
        let next = Math.min(cursor + chunkSize, normalized.length);
        const boundary = normalized.lastIndexOf('\n## ', next);
        if (boundary > cursor + 1200) next = boundary;
        const piece = normalized.slice(cursor, next).trim();
        parts.push({
            name: `${title}.part${String(index).padStart(2, '0')}.md`,
            content: `# ${title} Part ${index}\n\n${piece}`
        });
        cursor = next;
        index += 1;
    }
    return parts;
}

function formatBundleIndex(entries) {
    return [
        '# DevForge Bundle Index',
        '',
        'Dokumen di bundle ini sudah dipotong otomatis agar stabil dibaca AI IDE.',
        'Mulai dari file ringkas terlebih dahulu, lalu buka part lanjutan hanya jika diperlukan.',
        '',
        '## Files',
        ...entries.map(item => `- \`${item.name}\` — ${item.description}`)
    ].join('\n');
}

function createTaskPlanFromWorkspace() {
    const insights = getWorkspaceInsights();
    const plan = [
        { phase: 'plan', objective: 'Validasi arsitektur dan daftar file inti.', done: !!S.virtualWorkspace['MASTERPLAN.md'] },
        { phase: 'scaffold', objective: 'Pastikan bootstrap, config, dan entry file sudah runnable.', done: metaHasNoCriticalMissing() },
        { phase: 'implement', objective: 'Selesaikan fitur inti paling penting dari project.', done: false },
        { phase: 'review', objective: 'Periksa import, error handling, dependency, dan regression risk.', done: false },
        { phase: 'package', objective: insights.hasTauri ? 'Siapkan release desktop dan installer Windows.' : 'Siapkan build production dan deployment.', done: false }
    ];
    const md = [
        '# DevForge Task Plan',
        '',
        `- Generated: ${new Date().toLocaleString()}`,
        `- Profile: ${S.aiProfile || 'builder'}`,
        '',
        '## Execution Plan',
        ...plan.map(item => `- [${item.done ? 'x' : ' '}] ${item.phase.toUpperCase()}: ${item.objective}`)
    ].join('\n');
    return { plan, md };
}

function validateBundleEntries(entries) {
    const warnings = [];
    const files = Array.isArray(entries) ? entries : [];
    const names = files.map(item => item.name);
    const missing = ['README_BUNDLE.md', 'task_plan.md'].filter(name => !names.includes(name));
    if (missing.length) warnings.push(`File index wajib hilang: ${missing.join(', ')}`);

    files.forEach(file => {
        const content = String(file.content || '');
        const lineCount = content.split('\n').length;
        if (content.length > 12000) warnings.push(`${file.name} terlalu panjang (${content.length} chars).`);
        if (lineCount > 260) warnings.push(`${file.name} terlalu panjang (${lineCount} lines).`);
        if (/[^\x00-\x7F]/.test(content)) {
            warnings.push(`${file.name} mengandung karakter non-ASCII yang berpotensi bermasalah pada beberapa tool.`);
        }
    });

    const summary = warnings.length
        ? `Bundle butuh perhatian: ${warnings.length} warning terdeteksi.`
        : 'Bundle validation passed. Struktur dan ukuran dokumen aman untuk AI IDE.';

    const md = [
        '# Bundle Validation Report',
        '',
        `- Generated: ${new Date().toLocaleString()}`,
        `- Files Checked: ${files.length}`,
        `- Result: ${summary}`,
        '',
        '## Warnings',
        ...(warnings.length ? warnings.map(item => `- ${item}`) : ['- No structural warnings detected.'])
    ].join('\n');

    return { warnings, summary, md };
}

function buildGeneratedEnvExample(){
    const envKeys = scanEnvKeys();
    if (!envKeys.length) {
        return [
            '# Environment variables for local development',
            'NODE_ENV=development'
        ].join('\n') + '\n';
    }
    return [
        '# Environment variables for local development',
        ...envKeys.map(key => `${key}=`),
        ''
    ].join('\n');
}

function buildGeneratedCiWorkflow(){
    const runtime = detectWorkspaceRuntime();
    const install = runtime.installCommand || 'npm install';
    const build = runtime.buildCommand || '';
    const test = runtime.testCommand || '';
    return [
        'name: ci',
        '',
        'on:',
        '  push:',
        '    branches: [main]',
        '  pull_request:',
        '',
        'jobs:',
        '  build:',
        '    runs-on: windows-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - uses: actions/setup-node@v4',
        '        with:',
        '          node-version: 22',
        '      - name: Install dependencies',
        `        run: ${install}`,
        ...(test ? ['      - name: Run tests', `        run: ${test}`] : []),
        ...(build ? ['      - name: Build app', `        run: ${build}`] : [])
    ].join('\n') + '\n';
}

function runProjectDoctorAutoFix(){
    const insights = getWorkspaceInsights();
    const changed = [];
    if (!insights.hasReadme) {
        saveVirtualFile('README.md', buildGeneratedReadme());
        changed.push('README.md');
    }
    if (!getWorkspacePaths().includes('.gitignore')) {
        saveVirtualFile('.gitignore', buildGeneratedGitignore());
        changed.push('.gitignore');
    }
    if (!insights.hasEnvExample) {
        saveVirtualFile('.env.example', buildGeneratedEnvExample());
        changed.push('.env.example');
    }
    if (!insights.hasCi && detectWorkspaceRuntime().hasPackageJson) {
        saveVirtualFile('.github/workflows/ci.yml', buildGeneratedCiWorkflow());
        changed.push('.github/workflows/ci.yml');
    }
    syncDoctorArtifacts();
    refreshBuildMeta({
        summary: changed.length ? `Project Doctor auto-fix membuat ${changed.length} file fondasi.` : 'Project Doctor tidak menemukan auto-fix baru.',
        currentGoal: changed.length ? 'Review file fondasi yang baru dibuat dan lanjutkan pengembangan.' : S.buildMeta.currentGoal,
        lastChangedFiles: changed,
        lastReason: 'doctor-autofix'
    });
    addBuildLog(changed.length ? `PROJECT DOCTOR AUTO-FIX: ${changed.join(', ')}` : 'PROJECT DOCTOR: Tidak ada file baru yang perlu dibuat.', changed.length ? 'success' : 'info');
    render();
}
