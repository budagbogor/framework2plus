function getBuilderFileEmoji(path) {
    if (path.endsWith('.md')) return '📘';
    if (path.includes('.')) return '📄';
    return '📁';
}

function renderBuilderEmptyState(gClass) {
    return `
        <div class="builder-empty">
            <div class="builder-empty-icon">🏗️</div>
            <div class="q-title" style="font-size: 28px; background: linear-gradient(90deg, #fff, #00f0ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Autonomous Professional Developer</div>
            <div class="q-desc" style="max-width: 600px; margin-top: 20px; font-size: 16px; opacity: 0.8;">Platform ini akan mengambil alih peran sebagai <strong>Senior Developer</strong>. Ia akan merancang arsitektur, mendesain basis data, dan menulis kode siap produksi secara otonom 100%.</div>
            <button class="btn btn-generate ${gClass} builder-empty-btn" data-builder-action="start-autonomous-build" type="button">🚀 Mulai Pembangunan Otonom</button>
        </div>
    `;
}

function escapeAttr(value) {
    return String(value || '').replace(/'/g, "\\'");
}

function renderDiffDetailCard(item) {
    const tone = item.type === 'created' ? '#3fb950' : item.type === 'updated' ? '#00f0ff' : '#ff6b6b';
    const badge = item.deltaLines > 0 ? `+${item.deltaLines}` : `${item.deltaLines}`;
    const previewRows = [
        ...(item.addedPreview || []).map(line => ({ prefix: '+', line })),
        ...(item.removedPreview || []).map(line => ({ prefix: '-', line }))
    ].slice(0, 6);
    return `
        <div style="border:1px solid rgba(255,255,255,0.08); border-radius:14px; background:rgba(255,255,255,0.02); overflow:hidden;">
            <div style="padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; gap:8px; align-items:center;">
                <div style="min-width:0;">
                    <div style="font-size:12px; color:${tone}; font-weight:700;">${esc(item.path)}</div>
                    <div style="font-size:10px; opacity:.65; margin-top:3px;">${esc(item.type)} • ${item.beforeLines} -> ${item.afterLines} lines</div>
                </div>
                <div style="font-size:11px; color:${tone}; white-space:nowrap;">${badge}</div>
            </div>
            <div style="padding:10px 12px;">
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                    ${item.type === 'deleted'
                        ? `<span style="padding:5px 8px; border-radius:999px; background:rgba(255,107,107,0.08); border:1px solid rgba(255,107,107,0.16); font-size:10px;">deleted</span>`
                        : `<button class="nav-btn" style="padding:6px 10px; font-size:10px;" onclick="viewVirtualFile('${escapeAttr(item.path)}')">Buka File</button>`}
                </div>
                ${previewRows.length ? `
                <div style="display:flex; flex-direction:column; gap:6px;">
                    ${previewRows.map(row => `<div style="font-family:var(--mono); font-size:11px; padding:7px 9px; border-radius:10px; background:${row.prefix === '+' ? 'rgba(63,185,80,0.08)' : 'rgba(255,107,107,0.08)'}; border:1px solid rgba(255,255,255,0.06);"><strong style="color:${row.prefix === '+' ? '#3fb950' : '#ff6b6b'}">${row.prefix}</strong> ${esc(row.line)}</div>`).join('')}
                </div>` : `<div style="font-size:11px; opacity:.55;">Preview perubahan belum tersedia.</div>`}
            </div>
        </div>
    `;
}

function renderBuilderPanel(){
    const meta = Object.assign(defaultBuildMeta(), S.buildMeta || {});
    const insights = getWorkspaceInsights();
    const runtime = insights.runtime;
    const smartActions = getSmartActionPresets();
    const aiProfiles = getAgentProfilePresets();
    const queue = Array.isArray(S.buildQueue) ? S.buildQueue : [];
    const lastDiff = getLastWorkspaceDiff();
    const nativeState = S.nativeCommandState || { activeCount: 0, currentLabel: '', lastStatus: 'idle', lastExitCode: null };
    const releasePipeline = S.releasePipeline || { active: false, steps: [], currentStep: '', lastResult: 'idle' };
    const releaseArtifacts = Array.isArray(S.releaseArtifacts) ? S.releaseArtifacts : [];
    const logs = (S.buildLogs || []).map(l => `
        <div class="term-line">
            <span class="term-ts">[${l.time}]</span>
            <span class="term-msg ${l.type}">${l.msg}</span>
        </div>
    `).join('');

    const files = Object.keys(S.virtualWorkspace || {}).map(path => `
        <div class="file-item ${S.activeFile===path?'active':''}" onclick="viewVirtualFile('${path}')">
            <span>${getBuilderFileEmoji(path)}</span>
            ${path}
        </div>
    `).join('');

    const gClass = (S.mode === 'website') ? 'pink' : (S.mode === 'adlc') ? 'green' : (S.mode === 'desktop') ? 'amber' : '';

    if(!S.building && Object.keys(S.virtualWorkspace || {}).length === 0){
        return renderBuilderEmptyState(gClass);
    }

    return `
        <div class="builder-grid">
            <div class="builder-sidebar">
                <div class="builder-head">
                    <span class="builder-title">Explorer ${S.isNative ? '🏠' : '☁️'}</span>
                    ${!S.building ? `<button class="nav-btn" onclick="downloadVirtualProject()" style="padding: 6px 12px; font-size: 11px; background: rgba(63, 185, 80, 0.15); color: #3fb950; border: 1px solid rgba(63, 185, 80, 0.2); border-radius: 8px;">📥 Export</button>` : ''}
                </div>
                ${S.isNative ? `<div style="padding:10px; font-size:10px; opacity:0.6; border-bottom:1px solid rgba(255,255,255,0.05)">Path: ${S.workspacePath}</div>` : ''}
                <div class="file-tree">${files || '<div style="opacity:0.3; font-size:11px; padding:20px; text-align:center;">Menyiapkan workspace...</div>'}</div>
            </div>
            <div class="builder-main">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:16px;">
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Phase</div>
                        <div style="font-size:18px; font-weight:800; margin-top:6px;">${esc(meta.phase || 'idle')}</div>
                        <div style="font-size:11px; opacity:.7; margin-top:6px;">${meta.lastUpdated ? `Update ${esc(meta.lastUpdated)}` : 'Menunggu build pertama'}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Workspace</div>
                        <div style="font-size:18px; font-weight:800; margin-top:6px;">${meta.fileCount || 0} file</div>
                        <div style="font-size:11px; opacity:.7; margin-top:6px;">Checklist ${meta.checklistDone || 0}/${meta.checklistTotal || 0}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Critical</div>
                        <div style="font-size:18px; font-weight:800; margin-top:6px;">${meta.missingCriticalFiles?.length ? `${meta.missingCriticalFiles.length} missing` : 'Complete'}</div>
                        <div style="font-size:11px; opacity:.7; margin-top:6px;">${meta.missingCriticalFiles?.length ? esc(meta.missingCriticalFiles.join(', ')) : 'File inti terdeteksi'}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Health</div>
                        <div style="font-size:18px; font-weight:800; margin-top:6px;">${insights.healthScore}/100</div>
                        <div style="font-size:11px; opacity:.7; margin-top:6px;">${esc(runtime.projectType)} via ${esc(runtime.packageManager)}</div>
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px; margin-bottom:16px;">
                    <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:8px;">Build Summary</div>
                    <div style="font-size:14px; line-height:1.6; color:rgba(255,255,255,0.9);">${esc(meta.summary || 'Belum ada ringkasan build.')}</div>
                    <div style="margin-top:10px; font-size:12px; opacity:.8;"><strong style="color:#fff;">Current goal:</strong> ${esc(meta.currentGoal || 'Menunggu instruksi agent.')}</div>
                    ${meta.projectBrainSummary ? `<div style="margin-top:10px; font-size:12px; opacity:.76;"><strong style="color:#fff;">Project brain:</strong> ${esc(meta.projectBrainSummary)}</div>` : ''}
                    ${meta.bundleValidationSummary ? `<div style="margin-top:10px; font-size:12px; opacity:.76;"><strong style="color:#fff;">Bundle validation:</strong> ${esc(meta.bundleValidationSummary)}</div>` : ''}
                    ${meta.remainingTasks?.length ? `
                    <div style="margin-top:12px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:8px;">Remaining Tasks</div>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${meta.remainingTasks.slice(0, 6).map(task => `<span style="padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); font-size:11px;">${esc(task)}</span>`).join('')}
                        </div>
                    </div>` : ''}
                </div>
                <div style="display:grid; grid-template-columns:1.3fr .9fr; gap:16px; margin-bottom:16px;">
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:10px;">IDE Intelligence</div>
                        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                            ${Object.entries(aiProfiles).map(([key, profile]) => `<button class="nav-btn" style="padding:8px 12px; font-size:11px; ${S.aiProfile===key?'background:rgba(0,240,255,0.12); border-color:rgba(0,240,255,0.28); color:#00f0ff;':''}" onclick="setAIProfile('${key}')">${esc(profile.label)}</button>`).join('')}
                        </div>
                        <div style="font-size:11px; line-height:1.6; opacity:.72; margin-bottom:12px;">${esc(aiProfiles[S.aiProfile]?.guidance || '')}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                            ${smartActions.map(action => `<button class="nav-btn" style="padding:8px 12px; font-size:11px;" onclick="applySmartAction('${action.key}')">${esc(action.label)}</button>`).join('')}
                        </div>
                        <div style="font-size:12px; line-height:1.7; opacity:.82;">
                            <div><strong style="color:#fff;">Install:</strong> ${esc(runtime.installCommand || 'n/a')}</div>
                            <div><strong style="color:#fff;">Dev:</strong> ${esc(runtime.devCommand || 'n/a')}</div>
                            <div><strong style="color:#fff;">Build:</strong> ${esc(runtime.buildCommand || 'n/a')}</div>
                            <div><strong style="color:#fff;">Test:</strong> ${esc(runtime.testCommand || 'belum ada')}</div>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:10px;">Diagnostics</div>
                        <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                            <div style="display:flex; justify-content:space-between; gap:12px;"><span>Tests</span><strong style="color:${insights.hasTests ? '#3fb950' : '#ffbd2e'}">${insights.hasTests ? 'Ready' : 'Missing'}</strong></div>
                            <div style="display:flex; justify-content:space-between; gap:12px;"><span>.env.example</span><strong style="color:${insights.hasEnvExample ? '#3fb950' : '#ffbd2e'}">${insights.hasEnvExample ? 'Ready' : 'Missing'}</strong></div>
                            <div style="display:flex; justify-content:space-between; gap:12px;"><span>README</span><strong style="color:${insights.hasReadme ? '#3fb950' : '#ffbd2e'}">${insights.hasReadme ? 'Ready' : 'Missing'}</strong></div>
                            <div style="display:flex; justify-content:space-between; gap:12px;"><span>CI / Docker</span><strong style="color:${(insights.hasCi || insights.hasDocker) ? '#3fb950' : '#ffbd2e'}">${insights.hasCi || insights.hasDocker ? 'Available' : 'Missing'}</strong></div>
                            ${S.isNative ? `<div style="display:flex; justify-content:space-between; gap:12px;"><span>Native Queue</span><strong style="color:${nativeState.activeCount ? '#00f0ff' : '#8b949e'}">${nativeState.activeCount ? `${nativeState.activeCount} active` : 'Idle'}</strong></div>` : ''}
                            ${S.isNative ? `<div style="display:flex; justify-content:space-between; gap:12px;"><span>Last Native Status</span><strong style="color:${nativeState.lastStatus === 'failed' ? '#ff6b6b' : nativeState.lastStatus === 'completed' ? '#3fb950' : '#8b949e'}">${esc(nativeState.lastStatus)}${nativeState.lastExitCode != null ? ` (${nativeState.lastExitCode})` : ''}</strong></div>` : ''}
                        </div>
                    </div>
                </div>
                ${S.isNative ? `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
                        <div>
                            <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Windows Release</div>
                            <div style="font-size:14px; font-weight:700; margin-top:6px;">${nativeState.currentLabel ? `Menjalankan ${esc(nativeState.currentLabel)}` : 'One-click install, test, build, dan bundle Tauri'}</div>
                        </div>
                        <button class="nav-btn" style="padding:8px 14px; font-size:11px;" onclick="execTerminalCmd('release')">One-Click Release</button>
                    </div>
                    <div style="margin-top:14px; display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px;">
                        ${(releasePipeline.steps || []).map(step => {
                            const tone = step.status === 'completed'
                                ? '#3fb950'
                                : step.status === 'running'
                                    ? '#00f0ff'
                                    : step.status === 'failed'
                                        ? '#ff6b6b'
                                        : step.status === 'skipped'
                                            ? '#ffbd2e'
                                            : '#8b949e';
                            const background = step.status === 'completed'
                                ? 'rgba(63,185,80,0.12)'
                                : step.status === 'running'
                                    ? 'rgba(0,240,255,0.10)'
                                    : step.status === 'failed'
                                        ? 'rgba(255,107,107,0.10)'
                                        : step.status === 'skipped'
                                            ? 'rgba(255,189,46,0.10)'
                                            : 'rgba(255,255,255,0.04)';
                            return `<div style="padding:12px; border:1px solid rgba(255,255,255,0.08); border-radius:14px; background:${background}">
                                <div style="font-size:11px; opacity:.7; text-transform:uppercase; letter-spacing:.08em;">${esc(step.label)}</div>
                                <div style="font-size:14px; color:${tone}; font-weight:800; margin-top:8px;">${esc(step.status || 'pending')}</div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div style="margin-top:12px; font-size:11px; opacity:.72;">Status akhir: <strong style="color:${releasePipeline.lastResult === 'completed' ? '#3fb950' : releasePipeline.lastResult === 'failed' ? '#ff6b6b' : '#8b949e'}">${esc(releasePipeline.lastResult || 'idle')}</strong></div>
                    <div style="margin-top:14px; display:flex; justify-content:space-between; gap:12px; align-items:center;">
                        <div style="font-size:11px; opacity:.72;">Artefak terdeteksi: ${releaseArtifacts.length}</div>
                        <button class="nav-btn" style="padding:7px 12px; font-size:11px;" onclick="refreshReleaseArtifacts()">Refresh Artifacts</button>
                    </div>
                    ${releaseArtifacts.length ? `
                    <div style="margin-top:12px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                        ${releaseArtifacts.map(item => `<a href="${esc(item.path)}" style="display:block; text-decoration:none; color:inherit; padding:12px; border:1px solid rgba(255,255,255,0.08); border-radius:14px; background:rgba(255,255,255,0.03);">
                            <div style="font-size:12px; font-weight:700; color:${item.artifact_type === 'exe' ? '#3fb950' : '#00f0ff'};">${esc(item.file_name)}</div>
                            <div style="font-size:11px; opacity:.68; margin-top:6px;">${esc(item.artifact_type.toUpperCase())} • ${(item.size_bytes / (1024 * 1024)).toFixed(2)} MB</div>
                        </a>`).join('')}
                    </div>` : `<div style="margin-top:12px; font-size:11px; opacity:.55;">Belum ada artefak <code>.exe</code> atau <code>.msi</code> yang terdeteksi.</div>`}
                </div>` : ''}
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:10px;">Changed Files</div>
                        ${meta.lastChangedFiles?.length ? `
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${meta.lastChangedFiles.slice(0, 8).map(path => `<span style="padding:6px 10px; border-radius:999px; background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.14); font-size:11px;">${esc(path)}</span>`).join('')}
                        </div>` : `<div style="font-size:12px; opacity:.7;">Belum ada diff iterasi terakhir.</div>`}
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:10px;">Project Brain</div>
                        ${meta.projectBrainRisks?.length ? `
                        <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                            ${meta.projectBrainRisks.slice(0, 5).map(item => `<div style="padding:8px 10px; border-radius:12px; background:rgba(0,240,255,0.07); border:1px solid rgba(0,240,255,0.14);">${esc(item)}</div>`).join('')}
                        </div>` : `<div style="font-size:12px; opacity:.7;">Project brain belum dibuat.</div>`}
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:10px;">Project Doctor</div>
                        ${meta.doctorFindings?.length ? `
                        <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                            ${meta.doctorFindings.slice(0, 5).map(item => `<div style="padding:8px 10px; border-radius:12px; background:rgba(255,189,46,0.08); border:1px solid rgba(255,189,46,0.16);">${esc(item)}</div>`).join('')}
                        </div>` : `<div style="font-size:12px; opacity:.7;">Doctor report belum dibuat.</div>`}
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:12px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Diff Viewer</div>
                        <div style="font-size:11px; opacity:.7;">Artefak: CHANGES_LAST_STEP.json</div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px;">
                        ${[
                            { key: 'created', label: 'Created', tone: '#3fb950', bg: 'rgba(63,185,80,0.08)' },
                            { key: 'updated', label: 'Updated', tone: '#00f0ff', bg: 'rgba(0,240,255,0.08)' },
                            { key: 'deleted', label: 'Deleted', tone: '#ff6b6b', bg: 'rgba(255,107,107,0.08)' }
                        ].map(group => {
                            const items = Array.isArray(lastDiff[group.key]) ? lastDiff[group.key] : [];
                            return `<div style="border:1px solid rgba(255,255,255,0.08); border-radius:14px; background:rgba(255,255,255,0.02); overflow:hidden;">
                                <div style="padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; gap:8px;">
                                    <strong style="font-size:12px; color:${group.tone};">${group.label}</strong>
                                    <span style="font-size:11px; opacity:.7;">${items.length}</span>
                                </div>
                                <div style="padding:10px; display:flex; flex-direction:column; gap:8px; min-height:110px;">
                                    ${items.length ? items.slice(0, 6).map(path => group.key === 'deleted'
                                        ? `<div style="padding:8px 10px; border-radius:10px; background:${group.bg}; border:1px solid rgba(255,255,255,0.08); font-size:11px;">${esc(path)}</div>`
                                        : `<button class="nav-btn" style="justify-content:flex-start; text-align:left; padding:8px 10px; background:${group.bg}; border-color:rgba(255,255,255,0.08); font-size:11px;" onclick="viewVirtualFile('${path.replace(/'/g, "\\'")}')">${esc(path)}</button>`
                                    ).join('') : `<div style="font-size:11px; opacity:.55;">Tidak ada file.</div>`}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:12px;">
                        <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55;">Diff Details</div>
                        <div style="font-size:11px; opacity:.7;">Preview line delta per file</div>
                    </div>
                    ${Array.isArray(lastDiff.details) && lastDiff.details.length
                        ? `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px;">
                            ${lastDiff.details.slice(0, 6).map(renderDiffDetailCard).join('')}
                        </div>`
                        : `<div style="font-size:12px; opacity:.7;">Belum ada detail diff untuk langkah terakhir.</div>`}
                </div>
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px; margin-bottom:16px;">
                    <div style="font-size:10px; letter-spacing:.12em; text-transform:uppercase; opacity:.55; margin-bottom:10px;">Autonomous Queue</div>
                    ${queue.length ? `
                    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
                        ${queue.map(step => {
                            const background = step.status === 'completed'
                                ? 'rgba(63,185,80,0.12)'
                                : step.status === 'active'
                                    ? 'rgba(0,240,255,0.10)'
                                    : 'rgba(255,255,255,0.04)';
                            const borderColor = step.status === 'completed'
                                ? 'rgba(63,185,80,0.28)'
                                : step.status === 'active'
                                    ? 'rgba(0,240,255,0.24)'
                                    : 'rgba(255,255,255,0.08)';
                            const badge = step.status === 'completed' ? 'done' : step.status === 'active' ? 'active' : 'queued';
                            return `<div style="padding:12px; border:1px solid ${borderColor}; border-radius:14px; background:${background}">
                                <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                                    <strong style="font-size:12px; color:#fff;">${esc(step.label)}</strong>
                                    <span style="font-size:10px; text-transform:uppercase; opacity:.7;">${badge}</span>
                                </div>
                                <div style="font-size:11px; opacity:.72; margin-top:8px;">${esc(step.goal || '')}</div>
                            </div>`;
                        }).join('')}
                    </div>` : `<div style="font-size:12px; opacity:.7;">Queue build belum diinisialisasi.</div>`}
                </div>
                <div class="workflow-steps">
                    <div class="step-item ${Object.keys(S.virtualWorkspace).length > 0 ? 'done' : 'active'}">
                        <div class="step-num">${Object.keys(S.virtualWorkspace).length > 0 ? '✓' : '1'}</div>
                        <div class="step-text">BUILD CODE</div>
                    </div>
                    <div class="step-item ${S.isDevRunning ? 'done' : (Object.keys(S.virtualWorkspace).length > 0 ? 'active' : '')}">
                        <div class="step-num">${S.isDevRunning ? '✓' : '2'}</div>
                        <div class="step-text">START DEV</div>
                    </div>
                    <div class="step-item ${Object.keys(S.virtualWorkspace).length > 0 ? 'active' : ''}">
                        <div class="step-num">3</div>
                        <div class="step-text">PREVIEW</div>
                    </div>
                </div>
                <div class="terminal-panel" style="background: #010409; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; min-height: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                    <div class="terminal-header" style="background: rgba(255, 255, 255, 0.03); padding: 12px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                        <div class="term-dots" style="display: flex; gap: 6px;"><div style="width: 11px; height: 11px; border-radius: 50%; background:#ff5f56"></div><div style="width: 11px; height: 11px; border-radius: 50%; background:#ffbd2e"></div><div style="width: 11px; height: 11px; border-radius: 50%; background:#27c93f"></div></div>
                        <span style="font-family:var(--mono); font-size:11px; opacity:0.5; letter-spacing: 0.1em; margin-left:10px">AGENT CONSOLE - ${S.building ? 'ACTIVE' : 'READY'}</span>
                        ${S.building ? `<div class="agent-active-glow" style="width:8px; height:8px; background:#00f0ff; margin-left:auto; border-radius:50%; box-shadow: 0 0 15px #00f0ff;"></div>` : ''}
                    </div>
                    <div class="term-toolbar">
                        <button class="term-btn ${S.isInstalled?'active':''}" onclick="execTerminalCmd('install')">📦 install</button>
                        <button class="term-btn ${S.isDevRunning?'active':''}" onclick="execTerminalCmd('dev')">${S.isDevRunning ? '■ stop dev' : '🚀 dev'}</button>
                        <button class="term-btn" onclick="execTerminalCmd('build')">🏗️ build</button>
                        <button class="term-btn" onclick="execTerminalCmd('test')">test</button>
                        <button class="term-btn" onclick="execTerminalCmd('bundle')">bundle</button>
                        <button class="term-btn" onclick="execTerminalCmd('release')">release</button>
                        <button class="term-btn preview-btn" onclick="openLivePreview()">🌐 Preview</button>
                    </div>
                    <div class="term-body" id="buildTerminal" style="flex:1; padding:20px; overflow-y:auto; font-family:var(--mono); font-size:13px; line-height:1.6; color: rgba(255,255,255,0.85);">${logs || '<div style="opacity:0.3">Waiting for logs...</div>'}</div>
                </div>
                <div class="chat-container">
                    <div class="chat-input-row">
                        <input type="text" id="agentChatInput" class="chat-input-field" placeholder="Minta revisi atau tambah fitur... (Contoh: 'Tambahkan halaman login')" onkeydown="if(event.key==='Enter') submitAgentChat()">
                        <button class="chat-send-btn" onclick="submitAgentChat()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                </div>
                ${S.activeFile ? `
                <div class="code-block" style="border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden; background: #010409; margin-top:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div class="code-header" style="display:flex; align-items:center; justify-content:space-between; padding:12px 20px; background: rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05)">
                        <span style="font-size:11px; font-weight:700; color:var(--accent); letter-spacing:.1em; text-transform:uppercase">${S.activeFile}</span>
                        <button class="copy-btn" onclick="cpCode('activeCodeCont',this)">Salin Kode</button>
                    </div>
                    <pre style="flex:1; max-height:none; overflow:auto; padding: 24px; font-size: 14px; color: #e6edf3; line-height: 1.6;" id="activeCodeCont">${esc(S.virtualWorkspace[S.activeFile])}</pre>
                </div>` : ''}
            </div>
        </div>
    `;
}
