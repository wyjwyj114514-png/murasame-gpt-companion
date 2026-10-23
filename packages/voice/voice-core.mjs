// voice-core.mjs
//
// Pure JavaScript ES module implementing VoicePool, a small playback
// selection pool with two non-repeating strategies:
//
//   - "bag":      a shuffled bag (洗牌袋). Within one round every track is
//                 played exactly once, and the first track of a new round
//                 never equals the last track of the previous round
//                 (跨轮相邻不重复).
//   - "adjacent": only avoids playing the same track twice in a row.
//
// A single track can be played repeatedly in both modes.

const MODE_BAG = 'bag';
const MODE_ADJACENT = 'adjacent';
const MODES = new Set([MODE_BAG, MODE_ADJACENT]);

/**
 * Reject invalid RNG values rather than silently biasing the selection.
 */
function unitRandom(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random must return a finite number in [0, 1)');
  }
  return value;
}

export class VoicePool {
  #mode;
  #random;
  #tracks = [];
  #bag = [];
  #last = null;

  /**
   * @param {{mode?: 'bag'|'adjacent', random?: () => number}} [options]
   */
  constructor({ mode = MODE_BAG, random = Math.random } = {}) {
    if (!MODES.has(mode)) {
      throw new Error(`unknown mode: ${mode}`);
    }
    this.#mode = mode;
    this.#random = random;
  }

  /** Sanitized call to the injected random; always finite in [0, 1). */
  #rand() {
    return unitRandom(this.#random());
  }

  /**
   * Replace the track list. The input is de-duplicated in first-seen
   * order, empty ids are ignored, and the pool state (current bag and
   * last-played marker) is reset.
   *
   * @param {string[]} ids
   */
  setTracks(ids) {
    const seen = new Set();
    const tracks = [];
    if (ids != null) {
      for (const id of ids) {
        if (typeof id === 'string' && id.length > 0 && !seen.has(id)) {
          seen.add(id);
          tracks.push(id);
        }
      }
    }
    this.#tracks = tracks;
    this.#bag = [];
    this.#last = null;
  }

  /** Number of tracks still left in the current bag round. */
  get remaining() {
    return this.#bag.length;
  }

  /**
   * Return the next track id, or null when the pool is empty.
   *
   * @returns {string|null}
   */
  next() {
    const tracks = this.#tracks;
    if (tracks.length === 0) {
      return null;
    }
    if (this.#mode === MODE_ADJACENT) {
      return this.#nextAdjacent();
    }
    return this.#nextBag();
  }

  #nextBag() {
    if (this.#bag.length === 0) {
      this.#refillBag();
    }
    const id = this.#bag.pop();
    this.#last = id;
    return id;
  }

  #refillBag() {
    const bag = this.#tracks.slice();
    // Fisher–Yates shuffle; j is always an integer in [0, i].
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.#rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // Cross-round adjacency: the first id drawn in this new round is the
    // last slot of the shuffled bag. If it equals the last id drawn in
    // the previous round, swap it with the first slot (bag.length > 1
    // guarantees a different value lands there).
    if (
      bag.length > 1 &&
      this.#last !== null &&
      bag[bag.length - 1] === this.#last
    ) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    this.#bag = bag;
  }

  #nextAdjacent() {
    const tracks = this.#tracks;
    const n = tracks.length;
    if (n === 1) {
      this.#last = tracks[0];
      return tracks[0];
    }
    const lastIndex = tracks.indexOf(this.#last);
    if (lastIndex === -1) {
      // No previous pick: choose uniformly among all tracks.
      const j = Math.floor(this.#rand() * n);
      this.#last = tracks[j];
      return tracks[j];
    }
    // Choose uniformly among the n-1 tracks other than the last one.
    let j = Math.floor(this.#rand() * (n - 1));
    if (j >= lastIndex) {
      j += 1;
    }
    this.#last = tracks[j];
    return tracks[j];
  }
}
