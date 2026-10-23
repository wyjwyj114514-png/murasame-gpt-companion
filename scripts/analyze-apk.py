"""Inspect an APK as data only. Never execute APK code."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'work/python-deps'))
from mutagen.mp3 import MP3
from androguard.core.apk import APK
from androguard.core.dex import DEX
from loguru import logger
logger.remove()

source = Path(sys.argv[1])
out = ROOT / 'work/apk'
out.mkdir(parents=True, exist_ok=True)
audio_dir = ROOT / 'private-assets/voice'
audio_dir.mkdir(parents=True, exist_ok=True)
apk = APK(str(source))
resources = apk.get_android_resources()
report = {'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'package': apk.get_package(), 'version': apk.get_androidversion_name(),
          'audio': [], 'algorithm': 'unverified'}
with zipfile.ZipFile(source) as archive:
    for n, item in enumerate(sorted(x for x in archive.namelist() if x.endswith('.mp3')), 1):
        data = archive.read(item)
        name = f'{n:03}.mp3'
        dest = audio_dir / name
        dest.write_bytes(data)
        info = MP3(dest).info
        report['audio'].append({'id': name, 'apk_path': item, 'bytes': len(data),
                                'sha256': hashlib.sha256(data).hexdigest(),
                                'duration_seconds': info.length})
    app_methods = []
    for dex_name in [x for x in archive.namelist() if x.endswith('.dex')]:
        dex = DEX(archive.read(dex_name))
        matches = []
        for cls in dex.get_classes():
            name = cls.get_name()
            if name.startswith(('Landroid', 'Lkotlin', 'Lcom/google')):
                continue
            for method in cls.get_methods():
                code = method.get_code()
                if not code:
                    continue
                instructions = [f'{i.get_name()} {i.get_output()}' for i in code.get_bc().get_instructions()]
                joined = '\n'.join(instructions)
                if name.startswith('Lcom/stand/sounder/') and not name.startswith('Lcom/stand/sounder/R'):
                    app_methods.append(f'CLASS {name}\nMETHOD {method.get_name()} {method.get_descriptor()}\n{joined}\n')
                if any(s in joined.lower() for s in ['goshujin', 'ご主人', '狗修金', 'ljava/util/random;->nextint', 'ljava/util/collections;->shuffle']):
                    matches.append(f'CLASS {name}\nMETHOD {method.get_name()} {method.get_descriptor()}\n{joined}\n')
        (out / f'{dex_name}.matches.txt').write_text('\n'.join(matches), encoding='utf-8')
    (out / 'resources.xml').write_text(resources.get_public_resources(apk.get_package()).decode('utf-8'), encoding='utf-8')
    (out / 'app-methods.txt').write_text('\n'.join(app_methods), encoding='utf-8')
(ROOT / 'private-assets/voice/manifest.json').write_text(json.dumps({'tracks': [x['id'] for x in report['audio']]}, indent=2), encoding='utf-8')
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'package': report['package'], 'version': report['version'], 'mp3_count': len(report['audio']),
                  'unique_hashes': len(set(x['sha256'] for x in report['audio'])), 'evidence': str(out)}, ensure_ascii=False))
