// ===== STREAK.JS =====

const StreakManager = {
  motivations: [
    "You are unbelievable! 🚀",
    "Are you a robot? You're too consistent! 🤖",
    "Mashallah! Keep going! ✨",
    "SubhanAllah, you're incredible! 🌟",
    "You're on fire! Nothing can stop you! 🔥",
    "Champions are made of days like today! 🏆",
    "Look at you go! Absolutely unstoppable! 💪",
    "Your future self is thanking you right now! 🙏",
    "This is what dedication looks like! 👑",
    "Wow. Just wow. You're doing amazing! 😤",
    "The grind never lies. Respect! 💎",
    "Every legend has a streak like yours! ⭐",
  ],

  freezeMessages: [
    "Your tree is bending... but still standing! Hold on! 🌪️",
    "Even storms pass. Your roots are strong! 🌳",
    "Frozen today, but not forgotten! ❄️🌱",
    "The tree rests, but it remembers your dedication! 💙",
  ],

  warningMessages: [
    "⚠️ One day left! Complete your habits or use a Freeze!",
    "Your streak is in danger! Don't let it end now!",
    "Tomorrow is the last chance before your streak breaks!",
  ],

  getRandomMotivation() {
    return this.motivations[Math.floor(Math.random() * this.motivations.length)];
  },

  getRandomFreezeMsg() {
    return this.freezeMessages[Math.floor(Math.random() * this.freezeMessages.length)];
  },

  // Called at midnight or app open - checks streak status
  checkStreakOnOpen() {
    const streak = Store.getStreak();
    const todayStr = today();
    const lastDate = streak.lastDate;

    if (!lastDate) return { status: 'fresh' };

    const last = new Date(lastDate);
    const now = new Date(todayStr);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { status: 'today', streak: streak.current };
    } else if (diffDays === 1) {
      return { status: 'yesterday', streak: streak.current };
    } else if (diffDays === 2) {
      // Check freeze
      if (streak.freezeAvailable && !streak.freezeUsed) {
        return { status: 'freeze_available', streak: streak.current, diffDays };
      } else {
        return { status: 'broken_with_warning', streak: streak.current };
      }
    } else {
      // Streak broken
      return { status: 'broken', streak: streak.current };
    }
  },

  // Record today's completion
  recordCompletion(water = 1) {
    const streak = Store.getStreak();
    const todayStr = today();
    const lastDate = streak.lastDate;

    let newStreak = streak.current;

    if (!lastDate) {
      newStreak = 1;
    } else {
      const last = new Date(lastDate);
      const now = new Date(todayStr);
      const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already counted today
      } else if (diffDays === 1) {
        newStreak = streak.current + 1;
      } else {
        // Gap - reset
        newStreak = 1;
      }
    }

    // Update grass
    const grass = Store.getGrass();
    const existingIdx = grass.findIndex(g => g.date === todayStr);
    if (existingIdx === -1) {
      grass.push({ date: todayStr, water });
    } else {
      grass[existingIdx].water += water;
    }
    Store.setGrass(grass.slice(-365));

    const newStreakData = {
      ...streak,
      current: newStreak,
      longest: Math.max(streak.longest, newStreak),
      lastDate: todayStr,
      freezeUsed: false,
      warningShown: false,
      history: [...(streak.history || []).slice(-30), todayStr]
    };

    Store.setStreak(newStreakData);
    return newStreak;
  },

  breakStreak() {
    const streak = Store.getStreak();
    const oldStreak = streak.current;
    Store.setStreak({
      ...streak,
      current: 0,
      lastDate: null,
      freezeUsed: false,
      warningShown: false
    });
    return oldStreak;
  },

  useFreeze() {
    const streak = Store.getStreak();
    if (!streak.freezeAvailable) return false;

    // Extend lastDate by 1 to cover today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    Store.setStreak({
      ...streak,
      freezeAvailable: false,
      freezeUsed: true,
      lastDate: yesterdayStr
    });
    return true;
  },

  restoreFreeze() {
    const streak = Store.getStreak();
    // Restore freeze after 3 good days
    if (!streak.freezeAvailable && streak.current >= 3) {
      Store.setStreak({ ...streak, freezeAvailable: true });
      return true;
    }
    return false;
  },

  getStreakStatus() {
    const streak = Store.getStreak();
    return {
      current: streak.current,
      longest: streak.longest,
      frozen: streak.freezeUsed,
      freezeAvailable: streak.freezeAvailable,
      history: streak.history || []
    };
  },

  getMedal(days) {
    if (days >= 250) return { icon: '👑', name: 'Diamond', color: '#a78bfa' };
    if (days >= 200) return { icon: '🥇', name: 'Gold', color: '#fbbf24' };
    if (days >= 150) return { icon: '🥈', name: 'Silver', color: '#9ca3af' };
    if (days >= 100) return { icon: '🥉', name: 'Bronze', color: '#cd7c3b' };
    if (days >= 50) return { icon: '🏅', name: 'Iron', color: '#6b7280' };
    return { icon: '🪵', name: 'Wood', color: '#92400e' };
  },

  // Water earned per session (based on habits completed)
  calcWater(habitsCompleted, totalHabits) {
    if (totalHabits === 0) return 0;
    const pct = habitsCompleted / totalHabits;
    return Math.floor(pct * 10); // up to 10 gallons per session
  }
};
