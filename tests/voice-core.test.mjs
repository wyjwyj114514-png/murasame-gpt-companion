// voice-core.test.mjs
//
// node:test suite for VoicePool.
//
// Run with:  node --test voice-core.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePool } from '../packages/voice/voice-core.mjs';

/**
 * Deterministic seeded PRNG (mulberry32). Returns values in [0, 1).
 * Used for reproducible ("确定种子") tests.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTracks(n) {
  return Array.from({ length: n }, (_, i) => `track-${i}`);
}

test('64曲完整两轮(bag)：每轮为全排列，跨轮相邻不重复', () => {
  const tracks = makeTracks(64);
  const pool = new VoicePool({ random: mulberry32(20261020) });
  pool.setTracks(tracks);

  // remaining: 重置后本轮尚未发牌 → 0
  assert.equal(pool.remaining, 0);

  const round1 = [];
  for (let i = 0; i < 64; i++) {
    round1.push(pool.next());
    assert.equal(pool.remaining, 64 - i - 1, `第1轮第${i + 1}次后 remaining`);
  }
  assert.equal(pool.remaining, 0);

  const round2 = [];
  for (let i = 0; i < 64; i++) {
    round2.push(pool.next());
    assert.equal(pool.remaining, 64 - i - 1, `第2轮第${i + 1}次后 remaining`);
  }

  // 每轮都是 64 曲的全排列（无缺失、无重复）
  assert.equal(new Set(round1).size, 64, '第1轮不重复');
  assert.equal(new Set(round2).size, 64, '第2轮不重复');
  assert.deepEqual([...round1].sort(), [...tracks].sort(), '第1轮为全排列');
  assert.deepEqual([...round2].sort(), [...tracks].sort(), '第2轮为全排列');

  // 跨轮相邻不重复
  assert.notEqual(round1[63], round2[0], '跨轮相邻不重复');
});

test('空池：next() 返回 null（bag 与 adjacent 均适用）', () => {
  const bag = new VoicePool();
  bag.setTracks([]);
  assert.equal(bag.next(), null);
  assert.equal(bag.remaining, 0);

  const adj = new VoicePool({ mode: 'adjacent' });
  adj.setTracks(['']);
  assert.equal(adj.next(), null);
  assert.equal(adj.remaining, 0);
});

test('单曲：可反复播放，不会返回 null', () => {
  for (const mode of ['bag', 'adjacent']) {
    const pool = new VoicePool({ mode, random: mulberry32(7) });
    pool.setTracks(['only']);
    for (let i = 0; i < 10; i++) {
      assert.equal(pool.next(), 'only', `${mode} 模式第${i + 1}次`);
    }
  }
});

test('setTracks：去重、忽略空 id、重置池', () => {
  const pool = new VoicePool({ random: mulberry32(3) });
  pool.setTracks(['a', 'b']);
  pool.next(); // 消耗一个，使池处于“部分消耗”状态
  assert.equal(pool.remaining, 1);

  // 换库：去重 + 忽略空 id → 应为 ['x','y','z']，且重置池
  pool.setTracks(['x', 'y', 'x', '', 'z', '', 'y']);
  assert.equal(pool.remaining, 0, '换库后重置');

  const drawn = new Set();
  for (let i = 0; i < 3; i++) {
    const id = pool.next();
    assert.notEqual(id, null);
    drawn.add(id);
  }
  assert.deepEqual([...drawn].sort(), ['x', 'y', 'z'], '换库后一轮为去重后的曲集');
});

test('setTracks：保留输入顺序（adjacent + 恒0 random 揭示内部顺序）', () => {
  // 恒 0 random：adjacent 模式在无上次时取 index 0，之后轮流避开。
  // 因此序列应为 beta, alpha, beta, alpha, … 证明去重后的内部顺序保持输入顺序。
  const pool = new VoicePool({ mode: 'adjacent', random: () => 0 });
  pool.setTracks(['beta', 'alpha', 'beta', '']); // → ['beta','alpha']
  const seq = [pool.next(), pool.next(), pool.next(), pool.next()];
  assert.deepEqual(seq, ['beta', 'alpha', 'beta', 'alpha'], '顺序保留');
});

test('adjacent：只避免连续重复', () => {
  const tracks = ['a', 'b', 'c'];
  const pool = new VoicePool({ mode: 'adjacent', random: mulberry32(99) });
  pool.setTracks(tracks);

  let prev = null;
  for (let i = 0; i < 200; i++) {
    const id = pool.next();
    assert.ok(tracks.includes(id), `返回值非法: ${id}`);
    if (prev !== null) {
      assert.notEqual(id, prev, `第${i + 1}次与第${i}次连续重复`);
    }
    prev = id;
  }
});

test('坏 random：非有限或越界结果明确拒绝', () => {
  const badRandoms = [
    ['NaN', () => NaN],
    ['Infinity', () => Infinity],
    ['-Infinity', () => -Infinity],
    ['1.0(越上界)', () => 1],
    ['负数', () => -0.5],
    ['大于1', () => 3.7],
    ['非数字', () => 'x'],
  ];
  const tracks = ['a', 'b', 'c', 'd'];
  for (const [label, rnd] of badRandoms) {
    const pool = new VoicePool({ random: rnd });
    pool.setTracks(tracks);

    assert.throws(() => pool.next(), /random must return/, label);
  }
});

test('坏 mode：构造时抛出', () => {
  assert.throws(() => new VoicePool({ mode: 'shuffle' }), /unknown mode/);
  assert.throws(() => new VoicePool({ mode: '' }), /unknown mode/);
  assert.throws(() => new VoicePool({ mode: 'BAG' }), /unknown mode/);

  assert.doesNotThrow(() => new VoicePool({ mode: 'bag' }));
  assert.doesNotThrow(() => new VoicePool({ mode: 'adjacent' }));
  assert.doesNotThrow(() => new VoicePool());
});

test('确定种子：同种子序列一致', () => {
  const tracks = makeTracks(64);
  const a = new VoicePool({ random: mulberry32(1234) });
  const b = new VoicePool({ random: mulberry32(1234) });
  a.setTracks(tracks);
  b.setTracks(tracks);

  const seqA = [];
  const seqB = [];
  for (let i = 0; i < 200; i++) {
    seqA.push(a.next());
    seqB.push(b.next());
  }
  assert.deepEqual(seqA, seqB, '同种子应产生一致序列');
});

test('默认参数：mode=bag, random=Math.random 冒烟', () => {
  const tracks = makeTracks(64);
  const pool = new VoicePool();
  pool.setTracks(tracks);

  const round1 = [];
  for (let i = 0; i < 64; i++) {
    round1.push(pool.next());
  }
  assert.equal(new Set(round1).size, 64, '默认 bag 一轮为全排列');
  assert.notEqual(pool.next(), null, '下一轮继续');
});
