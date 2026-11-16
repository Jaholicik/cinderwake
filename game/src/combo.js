// The kill-streak tracker: kills landed close together build a combo that
// pays bonus score and shouts at its milestones. Let it cool and it resets.
// Pure bookkeeping — the game feeds it kills and reads the HUD numbers.

import { COMBO } from './config.js';

export class ComboTracker {
  constructor() {
    this.count = 0;
    this.timer = 0; // seconds left before the streak cools off
    this.best = 0;
    this.lastMilestone = 0;
  }

  reset() {
    this.count = 0;
    this.timer = 0;
    this.best = 0;
    this.lastMilestone = 0;
  }

  // Register a kill. Returns the milestone just crossed (0 when none) and
  // the bonus score this kill earns from the streak.
  hit() {
    this.count += 1;
    this.timer = COMBO.window;
    if (this.count > this.best) this.best = this.count;
    let milestone = 0;
    for (const mark of COMBO.milestones) {
      if (this.count >= mark && mark > this.lastMilestone) milestone = mark;
    }
    if (milestone > 0) this.lastMilestone = milestone;
    return { milestone, bonus: Math.min(this.count, COMBO.bonusCap) * COMBO.bonusPerKill };
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.count = 0;
        this.lastMilestone = 0;
      }
    }
  }

  // 0..1, how much of the streak window is left (for the HUD meter).
  get frac() {
    return this.count > 0 ? Math.max(0, this.timer / COMBO.window) : 0;
  }
}
