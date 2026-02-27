// ===== APP.JS - Main Application =====

// State
let currentTab = 'habits';
let onboardStep = 0;
let selectedCommit = null;
let midnightCheck = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  const settings = Store.getSettings();

  if (!settings.onboardDone) {
    document.getElementById('splash').addEventListener('animationend', () => {});
    setTimeout(() => {
      const splash = document.getElementById('splash');
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        document.getElementById('onboarding').classList.remove('hidden');
      }, 800);
    }, 2000);
  } else {
    setTimeout(() => {
      const splash = document.getElementById('splash');
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        initApp();
      }, 800);
    }, 1800);
  }

  // Theme
  applyTheme(settings.theme || 'dark');

  // Midnight check
  setInterval(midnightReset, 60 * 1000);
});

function initApp() {
  document.getElementById('app').classList.remove('hidden');

  // Check birthday
  checkBirthday();

  // Check streak
  checkStreakStatus();

  // Render everything
  renderSections();
  renderTasks();
  renderAnalytics();
  renderResult();
  renderSettings();
  updateTopBar();
  cycleMotivation();

  // Start motivation cycle
  setInterval(cycleMotivation, 12000);
}

// ===== ONBOARDING =====
function nextOnboard() {
  onboardStep++;
  document.querySelectorAll('.onboard-step').forEach(el => {
    el.classList.remove('active');
    if (parseInt(el.dataset.step) === onboardStep) el.classList.add('active');
  });
}

function saveProfile() {
  const name = document.getElementById('pName').value.trim();
  const father = document.getElementById('pFather').value.trim();
  const dob = document.getElementById('pDOB').value;
  const username = document.getElementById('pUsername').value.trim();
  const pin = document.getElementById('pPin').value;

  if (!name || !dob || !username || !pin || pin.length !== 4) {
    alert('Please fill all required fields (Name, DOB, Username, PIN)');
    return;
  }

  Store.setProfile({ name, father, dob, username, pin, createdAt: new Date().toISOString() });
  nextOnboard();
}

function finishOnboard() {
  if (!selectedCommit) return;

  const settings = Store.getSettings();
  settings.onboardDone = true;
  settings.commitment = selectedCommit;
  settings.startDate = new Date().toISOString();
  Store.setSettings(settings);

  const tree = Store.getTree();
  tree.startDate = new Date().toISOString();
  Store.setTree(tree);

  document.getElementById('onboarding').classList.add('hidden');
  initApp();
}

// Commit selection
document.querySelectorAll('.commit-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.commit-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    selectedCommit = parseInt(this.dataset.days);
    document.getElementById('commitNext').disabled = false;
  });
});

// ===== STREAK CHECK =====
function checkStreakStatus() {
  const status = StreakManager.checkStreakOnOpen();

  if (status.status === 'broken') {
    // Multiple days missed - reset
    StreakManager.breakStreak();
    showStreakDialog('⚠️ Streak Broken!',
      `Your ${status.streak}-day streak has ended. Starting fresh from Day 1!\n\nRemember: Every expert was once a beginner.`,
      false);
  } else if (status.status === 'broken_with_warning') {
    showStreakDialog('❄️ Streak Warning!',
      `You missed yesterday. Your ${status.streak}-day streak might break!\nComplete habits today or use your Freeze to save it.`,
      true);
  } else if (status.status === 'freeze_available' && status.diffDays >= 2) {
    showStreakDialog('🆘 Last Chance!',
      `You have a Streak Freeze available!\nUse it now to save your ${status.streak}-day streak!`,
      true, () => autoUseFreeze());
  }
}

function showStreakDialog(title, msg, showFreeze = false, onFreeze = null) {
  const dialog = document.getElementById('streakDialog');
  document.getElementById('streakDialogTitle').textContent = title;
  document.getElementById('streakDialogMsg').textContent = msg;

  const btns = document.querySelector('.streak-dialog-btns');
  btns.innerHTML = '';

  if (showFreeze) {
    const streak = Store.getStreak();
    if (streak.freezeAvailable && !streak.freezeUsed) {
      const freezeBtn = document.createElement('button');
      freezeBtn.className = 'btn-secondary';
      freezeBtn.textContent = '❄️ Use Freeze';
      freezeBtn.onclick = () => {
        StreakManager.useFreeze();
        closeStreakDialog();
        showNotif('Streak Frozen! 🧊 Come back strong tomorrow!');
        updateTopBar();
        renderResult();
        if (onFreeze) onFreeze();
      };
      btns.appendChild(freezeBtn);
    }
  }

  const okBtn = document.createElement('button');
  okBtn.className = 'btn-primary';
  okBtn.textContent = 'Got it!';
  okBtn.style.flex = '1';
  okBtn.onclick = closeStreakDialog;
  btns.appendChild(okBtn);

  dialog.classList.remove('hidden');
}

function closeStreakDialog() {
  document.getElementById('streakDialog').classList.add('hidden');
}

function autoUseFreeze() {
  StreakManager.useFreeze();
  updateTopBar();
}

// ===== SECTIONS =====
function renderSections() {
  const container = document.getElementById('sectionsContainer');
  const sections = Store.getSections();
  const habits = Store.getHabits();
  const completions = Store.getCompletions();
  const todayStr = today();

  if (sections.length === 0) {
    container.innerHTML = `
      <div class="sections-empty">
        <div class="empty-icon">🌱</div>
        <p>No sections yet.<br>Tap <strong>+</strong> to add your first section!</p>
      </div>`;
    return;
  }

  const todayComp = completions[todayStr] || {};

  container.innerHTML = sections.map(section => {
    const sectionHabits = habits.filter(h => h.sectionId === section.id);
    const doneCount = sectionHabits.filter(h => todayComp[h.id]).length;
    const pct = sectionHabits.length > 0 ? (doneCount / sectionHabits.length) * 100 : 0;
    const allDone = sectionHabits.length > 0 && doneCount === sectionHabits.length;

    return `
      <div class="section-card ${section.collapsed ? 'collapsed' : ''}" id="sec-${section.id}">
        <div class="section-header" onclick="toggleSection('${section.id}')">
          <div class="section-title-row">
            <span class="section-emoji">${section.emoji || '📌'}</span>
            <div>
              <div class="section-name">${escHtml(section.name)}</div>
              <div class="section-progress-bar">
                <div class="section-progress-fill" style="width:${pct}%"></div>
              </div>
            </div>
          </div>
          <div class="section-actions">
            <span style="font-size:0.75rem;color:var(--text2)">${doneCount}/${sectionHabits.length}</span>
            <button class="section-action-btn" onclick="event.stopPropagation();showAddHabit('${section.id}')" title="Add Habit">+</button>
            <button class="section-action-btn" onclick="event.stopPropagation();confirmDeleteSection('${section.id}')" title="Delete Section">🗑️</button>
            <span class="section-collapse-icon">▾</span>
          </div>
        </div>
        <div class="habits-list">
          ${sectionHabits.map(h => renderHabitRow(h, todayComp[h.id], section.id)).join('')}
          ${allDone && sectionHabits.length > 0 ? `<div style="text-align:center;padding:10px;color:var(--accent);font-style:italic;font-size:0.85rem;">Alhamdulillah! ✨ ${StreakManager.getRandomMotivation()}</div>` : ''}
          <button class="add-habit-btn" onclick="showAddHabit('${section.id}')">
            <span class="plus">+</span> <span>Add Habit</span>
          </button>
        </div>
      </div>`;
  }).join('');

  // Check all habits done
  const allHabits = habits;
  const doneAll = allHabits.length > 0 && allHabits.every(h => todayComp[h.id]);
  if (doneAll) {
    triggerAllComplete(allHabits.length);
  }
}

function renderHabitRow(h, isDone, sectionId) {
  return `
    <div class="habit-row" id="hr-${h.id}">
      <div class="habit-check ${isDone ? 'done' : ''}" onclick="toggleHabit('${h.id}', '${sectionId}')">
        ${isDone ? '✓' : ''}
      </div>
      <div class="habit-info">
        <div class="habit-name">${escHtml(h.name)}</div>
        ${h.desc ? `<div class="habit-desc">${escHtml(h.desc)}</div>` : ''}
      </div>
      <span class="habit-streak-mini">🔥${h.streak || 0}</span>
      <div class="habit-actions">
        <button class="habit-del-btn" onclick="confirmDeleteHabit('${h.id}')">✕</button>
      </div>
    </div>`;
}

function toggleSection(id) {
  const sections = Store.getSections();
  const idx = sections.findIndex(s => s.id === id);
  if (idx !== -1) sections[idx].collapsed = !sections[idx].collapsed;
  Store.setSections(sections);
  renderSections();
}

function toggleHabit(habitId, sectionId) {
  const completions = Store.getCompletions();
  const todayStr = today();
  if (!completions[todayStr]) completions[todayStr] = {};

  const wasDone = completions[todayStr][habitId];
  completions[todayStr][habitId] = !wasDone;
  Store.setCompletions(completions);

  // Update habit streak
  const habits = Store.getHabits();
  const idx = habits.findIndex(h => h.id === habitId);
  if (idx !== -1) {
    if (!wasDone) {
      habits[idx].streak = (habits[idx].streak || 0) + 1;
      habits[idx].lastDone = todayStr;
    } else {
      habits[idx].streak = Math.max(0, (habits[idx].streak || 1) - 1);
    }
    Store.setHabits(habits);
  }

  // Calculate water and update streak
  const allHabits = Store.getHabits().filter(h => {
    const section = Store.getSections().find(s => s.id === h.sectionId);
    return section != null;
  });
  const doneCount = allHabits.filter(h => completions[todayStr][h.id]).length;
  const water = StreakManager.calcWater(doneCount, allHabits.length);

  // Update tree water
  if (!wasDone) {
    const tree = Store.getTree();
    tree.totalWater = (tree.totalWater || 0) + 1;
    Store.setTree(tree);
    document.getElementById('totalWater').textContent = tree.totalWater;
  }

  // Update streak if all done today
  const allDone = allHabits.every(h => completions[todayStr][h.id]);
  if (allDone && !wasDone) {
    const newStreak = StreakManager.recordCompletion(water);
    updateTopBar();
    showNotif(`🔥 Day ${newStreak}! ${StreakManager.getRandomMotivation()}`);
    StreakManager.restoreFreeze();
  }

  renderSections();
  renderAnalytics();
  renderResult();
}

// ===== ADD SECTION =====
function showAddSection() {
  const sections = Store.getSections();
  const presets = [
    { name: 'Muslim', emoji: '🕌' },
    { name: 'Student', emoji: '📚' },
    { name: 'Health', emoji: '💪' },
    { name: 'Work', emoji: '💼' },
    { name: 'Personal', emoji: '🌟' },
    { name: 'Family', emoji: '👨‍👩‍👧' },
  ];

  showModal(`
    <div class="modal-title">Add Section</div>
    <div style="margin-bottom:12px">
      <label style="font-size:0.8rem;color:var(--text2);display:block;margin-bottom:6px">Quick Presets</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${presets.map(p => `<button class="commit-btn" onclick="quickSection('${p.name}','${p.emoji}')">${p.emoji} ${p.name}</button>`).join('')}
      </div>
    </div>
    <div class="field-group">
      <label>Section Name</label>
      <input type="text" id="secName" placeholder="e.g. Morning Routine">
    </div>
    <div class="field-group">
      <label>Emoji</label>
      <input type="text" id="secEmoji" placeholder="🏠" maxlength="2" value="📌">
    </div>
    <button class="btn-primary" onclick="addSection()">Add Section</button>
  `);
}

function quickSection(name, emoji) {
  document.getElementById('secName').value = name;
  document.getElementById('secEmoji').value = emoji;
}

function addSection() {
  const name = document.getElementById('secName').value.trim();
  const emoji = document.getElementById('secEmoji').value.trim() || '📌';
  if (!name) return;

  const sections = Store.getSections();
  sections.push({ id: genId(), name, emoji, collapsed: false, createdAt: today() });
  Store.setSections(sections);
  closeModal();
  renderSections();
}

function confirmDeleteSection(id) {
  const sections = Store.getSections();
  const sec = sections.find(s => s.id === id);
  showModal(`
    <div class="modal-title">Delete Section?</div>
    <p style="color:var(--text2);margin-bottom:20px">Delete "${escHtml(sec?.name || '')}" and all its habits? This cannot be undone.</p>
    <div style="display:flex;gap:10px">
      <button class="btn-danger" style="flex:1" onclick="deleteSection('${id}')">Delete</button>
      <button class="btn-secondary" style="flex:1" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function deleteSection(id) {
  let sections = Store.getSections();
  sections = sections.filter(s => s.id !== id);
  let habits = Store.getHabits();
  habits = habits.filter(h => h.sectionId !== id);
  Store.setSections(sections);
  Store.setHabits(habits);
  closeModal();
  renderSections();
}

// ===== ADD HABIT =====
function showAddHabit(sectionId) {
  showModal(`
    <div class="modal-title">Add Habit</div>
    <input type="hidden" id="habitSecId" value="${sectionId}">
    <div class="field-group">
      <label>Habit Name</label>
      <input type="text" id="habitName" placeholder="e.g. Read Quran 15 min">
    </div>
    <div class="field-group">
      <label>Description (optional)</label>
      <input type="text" id="habitDesc" placeholder="Details...">
    </div>
    <button class="btn-primary" onclick="addHabit()">Add Habit</button>
  `);
}

function addHabit() {
  const name = document.getElementById('habitName').value.trim();
  const desc = document.getElementById('habitDesc').value.trim();
  const sectionId = document.getElementById('habitSecId').value;
  if (!name) return;

  const habits = Store.getHabits();
  habits.push({ id: genId(), name, desc, sectionId, streak: 0, createdAt: today() });
  Store.setHabits(habits);
  closeModal();
  renderSections();
}

function confirmDeleteHabit(id) {
  const habits = Store.getHabits();
  const h = habits.find(h => h.id === id);
  showModal(`
    <div class="modal-title">Delete Habit?</div>
    <p style="color:var(--text2);margin-bottom:20px">Delete "${escHtml(h?.name || '')}"?</p>
    <div style="display:flex;gap:10px">
      <button class="btn-danger" style="flex:1" onclick="deleteHabit('${id}')">Delete</button>
      <button class="btn-secondary" style="flex:1" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function deleteHabit(id) {
  let habits = Store.getHabits();
  habits = habits.filter(h => h.id !== id);
  Store.setHabits(habits);

  // Remove from completions
  const completions = Store.getCompletions();
  Object.keys(completions).forEach(date => {
    delete completions[date][id];
  });
  Store.setCompletions(completions);
  closeModal();
  renderSections();
}

// ===== TASKS =====
function renderTasks() {
  const tasks = Store.getTasks();
  const completions = Store.getTaskCompletions();
  const list = document.getElementById('tasksList');
  const empty = document.getElementById('tasksEmpty');

  if (tasks.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = tasks.map(t => `
    <div class="task-item ${completions[t.id] ? 'done' : ''}" id="ti-${t.id}">
      <div class="task-check ${completions[t.id] ? 'done' : ''}" onclick="toggleTask('${t.id}')">
        ${completions[t.id] ? '✓' : ''}
      </div>
      <div class="task-info">
        <div class="task-name">${escHtml(t.name)}</div>
        ${t.note ? `<div class="task-note">${escHtml(t.note)}</div>` : ''}
        <div style="font-size:0.72rem;color:var(--text2);margin-top:4px">${t.date || ''}</div>
      </div>
      <button class="task-del" onclick="deleteTask('${t.id}')">✕</button>
    </div>
  `).join('');

  // Check if all tasks done → show Alhamdulillah
  const allDone = tasks.length > 0 && tasks.every(t => completions[t.id]);
  if (allDone) {
    list.innerHTML += `<div style="text-align:center;padding:20px;font-size:1.2rem;color:var(--accent);font-family:var(--font-head)">
      Alhamdulillah! 🌟<br><span style="font-size:0.9rem;font-family:var(--font-body)">${StreakManager.getRandomMotivation()}</span>
    </div>`;
  }
}

function showAddTask() {
  showModal(`
    <div class="modal-title">Add Task</div>
    <div class="field-group">
      <label>Task Name</label>
      <input type="text" id="taskName" placeholder="What needs to be done?">
    </div>
    <div class="field-group">
      <label>Notes (Google Keep style)</label>
      <textarea id="taskNote" class="note-editor" placeholder="Add notes, steps, anything..."></textarea>
    </div>
    <div class="field-group">
      <label>Due Date</label>
      <input type="date" id="taskDate">
    </div>
    <button class="btn-primary" onclick="addTask()">Add Task</button>
  `);
}

function addTask() {
  const name = document.getElementById('taskName').value.trim();
  const note = document.getElementById('taskNote').value.trim();
  const date = document.getElementById('taskDate').value;
  if (!name) return;

  const tasks = Store.getTasks();
  tasks.push({ id: genId(), name, note, date, createdAt: new Date().toISOString() });
  Store.setTasks(tasks);
  closeModal();
  renderTasks();
}

function toggleTask(id) {
  const completions = Store.getTaskCompletions();
  completions[id] = !completions[id];
  Store.setTaskCompletions(completions);
  renderTasks();
}

function deleteTask(id) {
  let tasks = Store.getTasks();
  tasks = tasks.filter(t => t.id !== id);
  const completions = Store.getTaskCompletions();
  delete completions[id];
  Store.setTasks(tasks);
  Store.setTaskCompletions(completions);
  renderTasks();
}

// ===== ANALYTICS =====
function renderAnalytics() {
  const streak = StreakManager.getStreakStatus();
  const habits = Store.getHabits();
  const completions = Store.getCompletions();
  const todayStr = today();
  const todayComp = completions[todayStr] || {};
  const doneTodayCount = habits.filter(h => todayComp[h.id]).length;
  const tree = Store.getTree();

  const grid = document.getElementById('analyticsGrid');
  if (!grid) return;

  // Weekly data
  const weekData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const comp = completions[ds] || {};
    const done = habits.filter(h => comp[h.id]).length;
    weekData.push({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], done, total: habits.length });
  }

  grid.innerHTML = `
    <div class="analytics-card">
      <div class="analytics-label">🔥 Current Streak</div>
      <div class="analytics-value">${streak.current}</div>
      <div class="analytics-sub">days</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">🏆 Longest Streak</div>
      <div class="analytics-value">${streak.longest}</div>
      <div class="analytics-sub">days record</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">✅ Today Done</div>
      <div class="analytics-value">${doneTodayCount}/${habits.length}</div>
      <div class="analytics-sub">habits</div>
    </div>
    <div class="analytics-card">
      <div class="analytics-label">💧 Total Water</div>
      <div class="analytics-value">${tree.totalWater || 0}</div>
      <div class="analytics-sub">gallons</div>
    </div>
    <div class="analytics-card full">
      <div class="analytics-label">📅 This Week</div>
      <div class="streak-chart">
        ${weekData.map(d => {
          const h = d.total > 0 ? Math.max(8, (d.done / d.total) * 50) : 8;
          const cls = d.done > 0 ? (d.done === d.total ? 'has' : 'has') : '';
          return `<div class="streak-bar ${cls}" style="height:${h}px" title="${d.label}: ${d.done}/${d.total}">
            <div style="text-align:center;font-size:0.6rem;margin-top:4px;color:var(--text2)">${d.label}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="analytics-card full">
      <div class="analytics-label">📊 Habit Completion Rate</div>
      <div style="margin-top:8px">
        ${habits.slice(0, 5).map(h => {
          const total = Object.keys(completions).length;
          const done = Object.values(completions).filter(c => c[h.id]).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return `<div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
              <span>${escHtml(h.name)}</span>
              <span style="color:var(--accent)">${pct}%</span>
            </div>
            <div style="height:4px;background:var(--bg3);border-radius:4px">
              <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px;transition:width 0.5s"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ===== RESULT / TREE =====
function renderResult() {
  const tree = Store.getTree();
  const streak = Store.getStreak();
  const days = streak.current || 0;

  document.getElementById('resultDays').textContent = `Day ${days}`;
  document.getElementById('totalWaterResult').textContent = `${tree.totalWater || 0} gallons`;

  const medal = StreakManager.getMedal(days);
  document.getElementById('resultMedal').textContent = `${medal.icon} ${medal.name}`;

  const stage = TreeRenderer.draw();
  document.getElementById('treeStage').textContent = TreeRenderer.getStageName(stage);

  // Grass grid
  renderGrass();
}

function renderGrass() {
  const grass = Store.getGrass();
  const container = document.getElementById('grassGrid');
  if (!container) return;

  const days = 91; // 13 weeks
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const entry = grass.find(g => g.date === ds);
    const w = entry ? entry.water : 0;
    let cls = '';
    if (w > 0 && w < 3) cls = 'g1';
    else if (w < 6) cls = 'g2';
    else if (w < 9) cls = 'g3';
    else if (w >= 9) cls = 'g4';
    cells.push(`<div class="grass-cell ${cls}" title="${ds}: ${w} gallons"></div>`);
  }

  container.innerHTML = `
    <div class="grass-title">🌿 Streak History (Last 13 Weeks)</div>
    <div class="grass-cells">${cells.join('')}</div>
  `;
}

// ===== SETTINGS =====
function renderSettings() {
  const profile = Store.getProfile();
  const settings = Store.getSettings();
  const streak = Store.getStreak();

  if (profile) {
    document.getElementById('profileCard').innerHTML = `
      <div class="profile-row"><span class="profile-row-label">Name</span><span class="profile-row-val">${escHtml(profile.name)}</span></div>
      <div class="profile-row"><span class="profile-row-label">Username</span><span class="profile-row-val">@${escHtml(profile.username)}</span></div>
      <div class="profile-row"><span class="profile-row-label">Father</span><span class="profile-row-val">${escHtml(profile.father || '-')}</span></div>
      <div class="profile-row"><span class="profile-row-label">Date of Birth</span><span class="profile-row-val">${profile.dob || '-'}</span></div>
      <div class="profile-row"><span class="profile-row-label">Commitment</span><span class="profile-row-val">${settings.commitment || '-'} days</span></div>
    `;
    document.getElementById('avatarInitial').textContent = profile.name.charAt(0).toUpperCase();
  }

  // Freeze status
  const freezeText = document.getElementById('freezeText');
  const freezeBtn = document.getElementById('freezeBtn');
  if (streak.freezeAvailable && !streak.freezeUsed) {
    freezeText.textContent = '❄️ Streak Freeze Available!';
    freezeBtn.disabled = false;
  } else if (streak.freezeUsed) {
    freezeText.textContent = '🧊 Freeze is active today';
    freezeBtn.disabled = true;
  } else {
    freezeText.textContent = '✅ Earn by maintaining 3-day streaks';
    freezeBtn.disabled = true;
  }

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === (settings.theme || 'dark'));
  });
}

function useStreakFreeze() {
  if (StreakManager.useFreeze()) {
    showNotif('Streak Frozen! 🧊 Come back tomorrow!');
    renderSettings();
    renderResult();
    updateTopBar();
  }
}

// ===== TOP BAR =====
function updateTopBar() {
  const streak = Store.getStreak();
  const tree = Store.getTree();
  document.getElementById('streakNum').textContent = streak.current || 0;
  document.getElementById('totalWater').textContent = tree.totalWater || 0;

  const profile = Store.getProfile();
  if (profile) {
    document.getElementById('avatarInitial').textContent = profile.name.charAt(0).toUpperCase();
  }
}

// ===== TABS =====
function showTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  if (tab === 'result') renderResult();
  if (tab === 'analytics') renderAnalytics();
  if (tab === 'settings') renderSettings();
}

// ===== MOTIVATION ===== 
const motivations = [
  "Every great journey begins with a single step 🌟",
  "Consistency is the key to mastery 🔑",
  "Your habits define your destiny 🎯",
  "Small steps, big results 🚀",
  "Be better than yesterday 💪",
  "Excellence is a habit, not an act ✨",
  "Your tree grows with every deed 🌱",
  "Alhamdulillah for another day to improve 🙏",
  "Winners do daily what others do occasionally 🏆",
  "Build yourself, one habit at a time 🧱",
];

let motIdx = 0;
function cycleMotivation() {
  const el = document.getElementById('motivText');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = motivations[motIdx % motivations.length];
    el.style.opacity = '1';
    el.style.transition = 'opacity 0.5s';
    motIdx++;
  }, 400);
}

// ===== COMPLETION ANIMATION =====
let completionShown = false;
function triggerAllComplete(waterEarned) {
  if (completionShown) return;
  completionShown = true;

  const el = document.getElementById('completionAnim');
  document.getElementById('completionText').textContent = 'Alhamdulillah!';
  document.getElementById('completionMsg').textContent = StreakManager.getRandomMotivation();
  el.classList.remove('hidden');

  TreeRenderer.animateWater(waterEarned, () => {
    setTimeout(() => {
      el.classList.add('hidden');
      completionShown = false;
      renderResult();
    }, 2000);
  });
}

// ===== BIRTHDAY CHECK =====
function checkBirthday() {
  const profile = Store.getProfile();
  if (!profile || !profile.dob) return;

  const lastBdayCheck = DB.get('lastBdayCheck');
  const todayStr = today();
  if (lastBdayCheck === todayStr) return;

  if (isBirthday(profile.dob)) {
    DB.set('lastBdayCheck', todayStr);
    showBirthday(profile.name);
  }
}

function showBirthday(name) {
  document.getElementById('birthdayMsg').textContent =
    `Happy Birthday ${name}! 🎂 May Allah bless you with health, happiness, and consistency in all your good deeds! Keep replacing bad deeds with good ones! 🌟`;
  document.getElementById('birthdayModal').classList.remove('hidden');
}

function closeBirthday() {
  document.getElementById('birthdayModal').classList.add('hidden');
}

// ===== THEME =====
function setTheme(theme) {
  applyTheme(theme);
  const settings = Store.getSettings();
  settings.theme = theme;
  Store.setSettings(settings);
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  renderResult(); // Redraw tree with new theme
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// ===== MODAL =====
function showModal(content) {
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.add('hidden');
}

window.closeModal = () => document.getElementById('modalOverlay').classList.add('hidden');

// ===== NOTIFICATIONS =====
function showNotif(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:var(--bg2);border:1px solid var(--accent);
    padding:12px 20px;border-radius:100px;font-size:0.85rem;
    color:var(--text);z-index:5000;animation:fadeUp 0.3s ease;
    white-space:nowrap;max-width:90vw;text-align:center;
    box-shadow:0 4px 20px rgba(0,212,180,0.2);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 500);
  }, 3000);
}

// ===== DATA MANAGEMENT =====
function exportData() {
  const data = DB.export();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `replace-deeds-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function confirmReset() {
  showModal(`
    <div class="modal-title" style="color:var(--danger)">⚠️ Reset App?</div>
    <p style="color:var(--text2);margin-bottom:20px">This will permanently delete ALL your data including streak, habits, and tree progress. This cannot be undone!</p>
    <div style="display:flex;gap:10px">
      <button class="btn-danger" style="flex:1" onclick="resetApp()">Yes, Reset Everything</button>
      <button class="btn-secondary" style="flex:1" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function resetApp() {
  DB.clear();
  location.reload();
}

// ===== STREAK INFO =====
function showStreakInfo() {
  const streak = StreakManager.getStreakStatus();
  const medal = StreakManager.getMedal(streak.current);
  showModal(`
    <div class="modal-title">🔥 Streak Info</div>
    <div class="medal-display">
      <div class="medal-icon">${medal.icon}</div>
      <div class="medal-name">${medal.name} Medal</div>
      <div class="medal-days">${streak.current} day streak</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
      <div style="background:var(--bg3);padding:12px;border-radius:10px;text-align:center">
        <div style="font-size:0.75rem;color:var(--text2)">Current</div>
        <div style="font-family:var(--font-mono);font-size:1.5rem;color:var(--accent)">${streak.current}</div>
      </div>
      <div style="background:var(--bg3);padding:12px;border-radius:10px;text-align:center">
        <div style="font-size:0.75rem;color:var(--text2)">Longest</div>
        <div style="font-family:var(--font-mono);font-size:1.5rem;color:var(--accent)">${streak.longest}</div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:0.8rem;color:var(--text2)">
      ❄️ Freeze: ${streak.freezeAvailable && !streak.frozen ? 'Available' : streak.frozen ? 'Active' : 'Not available'}
    </div>
  `);
}

function showProfile() {
  showTab('settings');
}

// ===== MIDNIGHT RESET =====
function midnightReset() {
  const checkKey = getMidnightCheck();
  if (midnightCheck === checkKey) return;

  const prevCheck = midnightCheck;
  midnightCheck = checkKey;

  if (prevCheck !== null) {
    // Day changed - refresh
    completionShown = false;
    renderSections();
    updateTopBar();
    checkBirthday();
  }
}

// ===== HELPERS =====
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
