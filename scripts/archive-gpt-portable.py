from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
folder = root / 'outputs' / 'Project-Murasame-GPT-portable-0.3.1'
archive = folder.with_name(folder.name + '-private.zip')
if archive.exists():
    raise FileExistsError(archive)
with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=3) as output:
    for file in sorted(folder.rglob('*')):
        if file.is_file():
            output.write(file, file.relative_to(folder.parent))
with zipfile.ZipFile(archive) as output:
    invalid = output.testzip()
    if invalid:
        raise RuntimeError('Corrupt archive entry: ' + invalid)
    count = len(output.namelist())
digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
report = {'archive': str(archive), 'entries': count, 'crcValid': True, 'sha256': digest, 'privateAssets': True}
(root / 'work' / 'portable-gpt-archive-0.3.1.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
