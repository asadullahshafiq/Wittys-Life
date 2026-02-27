// ===== DB.JS - Encrypted Local Storage =====
const DB = {
  _key: 'rd_v1_',
  
  // Simple XOR encryption
  _enc(str) {
    const k = 'RD2024SEC';
    let out = '';
    for (let i = 0; i < str.length; i++) {
      out += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return btoa(unescape(encodeURIComponent(out)));
  },

  _dec(str) {
    try {
      const raw = decodeURIComponent(escape(atob(str)));
      const k = 'RD2024SEC';
      let out = '';
      for (let i = 0; i < raw.length; i++) {
        out += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
      }
      return out;
    } catch { return null; }
  },

  set(key, val) {
    try {
      const str = JSON.stringify(val);
      localStorage.setItem(this._key + key, this._enc(str));
    } catch (e) {
      console.error('DB.set error', e);
    }
  },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key + key);
      if (!raw) return fallback;
      const dec = this._dec(raw);
      if (!dec) return fallback;
      return JSON.parse(dec);
    } catch {
      return fallback;
    }
  },

  del(key) {
    localStorage.removeItem(this._key + key);
  },

  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this._key));
    keys.forEach(k => localStorage.removeItem(k));
  },

  export() {
    const data = {};
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this._key));
    keys.forEach(k => {
      data[k.replace(this._key, '')] = this.get(k.replace(this._key, ''));
    });
    return JSON.stringify(data, null, 2);
  }
};

// ===== DATA MODELS =====
const Store = {
  // Profile
  getProfile: () => DB.get('profile', null),
  setProfile: (p) => DB.set('profile', p),

  // Sections  
  getSections: () => DB.get('sections', []),
  setSections: (s) => DB.set('sections', s),

  // Habits
  getHabits: () => DB.get('habits', []),
  setHabits: (h) => DB.set('habits', h),

  // Tasks
  getTasks: () => DB.get('tasks', []),
  setTasks: (t) => DB.set('tasks', t),

  // Streak data
  getStreak: () => DB.get('streak', {
    current: 0,
    longest: 0,
    lastDate: null,
    freezeAvailable: true,
    freezeUsed: false,
    history: [], // array of date strings
    warningShown: false
  }),
  setStreak: (s) => DB.set('streak', s),

  // Habit completions {date: {habitId: bool}}
  getCompletions: () => DB.get('completions', {}),
  setCompletions: (c) => DB.set('completions', c),

  // Task completions {taskId: bool}
  getTaskCompletions: () => DB.get('taskCompletions', {}),
  setTaskCompletions: (t) => DB.set('taskCompletions', t),

  // Tree / water
  getTree: () => DB.get('tree', {
    totalWater: 0,
    dailyWater: [],
    startDate: null,
    daysGrown: 0
  }),
  setTree: (t) => DB.set('tree', t),

  // Settings
  getSettings: () => DB.get('settings', {
    theme: 'dark',
    commitment: null,
    commitDays: 0,
    startDate: null,
    onboardDone: false
  }),
  setSettings: (s) => DB.set('settings', s),

  // Notes
  getNotes: () => DB.get('notes', []),
  setNotes: (n) => DB.set('notes', n),

  // Grass (streak history for display)
  getGrass: () => DB.get('grass', []),
  setGrass: (g) => DB.set('grass', g),
};

// Generate unique ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// Today's date string
function today() {
  return new Date().toISOString().split('T')[0];
}

// Is same day
function isSameDay(d1, d2) {
  return d1.split('T')[0] === d2.split('T')[0];
}

// Check birthday
function isBirthday(dob) {
  const now = new Date();
  const dobDate = new Date(dob);
  return now.getMonth() === dobDate.getMonth() && now.getDate() === dobDate.getDate();
}

// Midnight check
function getMidnightCheck() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}
