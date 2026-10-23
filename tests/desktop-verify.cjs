const fs = require('node:fs');
const path = require('node:path');
module.exports = async (window, app) => {
  const out = path.resolve(__dirname, '../outputs');
  fs.mkdirSync(out, { recursive: true });
  try {
    const report = await window.webContents.executeJavaScript(`(async () => {
      const manifest = await fetch('/local/voice/manifest.json').then(r => r.json());
      const context = new AudioContext();
      const decoded = [];
      for (const id of manifest.tracks) {
        const bytes = await fetch('/local/voice/' + id).then(r => r.arrayBuffer());
        const audio = await context.decodeAudioData(bytes);
        decoded.push({ id, duration: audio.duration, channels: audio.numberOfChannels, samples: audio.length });
      }
      await context.close();
      const image = document.getElementById('character');
      if (!image.complete) await new Promise(resolve => { image.onload = resolve; });
      document.body.classList.add('show-settings');
      await new Promise(resolve => requestAnimationFrame(resolve));
      const settingsVisible = document.querySelector('.settings').getBoundingClientRect().bottom <= innerHeight;
      return { title: document.title, characterVisible: image.naturalWidth > 0, settingsVisible, voiceCount: manifest.tracks.length, decoded };
    })()`);
    if (!report.characterVisible || !report.settingsVisible || report.voiceCount !== 64 || report.decoded.length !== 64) throw new Error('Desktop asset/layout verification failed');
    report.windowVisible = window.isVisible();
    report.alwaysOnTop = window.isAlwaysOnTop();
    report.electronVersion = process.versions.electron;
    report.checkedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'desktop-verification.json'), JSON.stringify(report, null, 2));
    const shot = await window.webContents.capturePage();
    fs.writeFileSync(path.join(out, '丛雨桌宠初版.png'), shot.toPNG());
    console.log('Desktop verification passed: 64/64 MP3 decoded, character rendered, screenshot saved');
    app.quit();
  } catch (error) {
    fs.writeFileSync(path.join(out, 'desktop-verification-error.txt'), error.stack);
    app.exit(1);
  }
};
