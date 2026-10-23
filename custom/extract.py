"""公式ZIPを展開する。絶対パス、親参照、シンボリックリンクを拒否する。"""
import json
import shutil
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath


def extract(archive, destination):
    destination = Path(destination).resolve()
    with zipfile.ZipFile(archive) as z:
        entries = z.infolist()
        if sum(e.file_size for e in entries) > 2 * 1024**3:
            raise ValueError('展開後のサイズが2GBを超えます')
        seen = set()
        for entry in entries:
            p = PurePosixPath(entry.filename)
            if (p.is_absolute() or '..' in p.parts or '\\' in entry.filename
                    or any(':' in part for part in p.parts)
                    or stat.S_ISLNK(entry.external_attr >> 16)):
                raise ValueError('不正なZIPエントリー: ' + entry.filename)
            key = str(p).casefold()
            if key in seen:
                raise ValueError('重複したZIPエントリー: ' + entry.filename)
            seen.add(key)
        manifests = [e for e in entries if PurePosixPath(e.filename).name == 'RELEASE-MANIFEST.json']
        if len(manifests) != 1:
            raise ValueError('公式マニフェストを一意に確認できません')
        base = PurePosixPath(manifests[0].filename).parent
        for entry in entries:
            rel = PurePosixPath(entry.filename).relative_to(base)
            if str(rel) == '.':
                continue
            target = destination.joinpath(*rel.parts)
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with z.open(entry) as source, target.open('xb') as output:
                    shutil.copyfileobj(source, output)
    print(json.dumps({'directory': str(destination)}))


if __name__ == '__main__':
    extract(*sys.argv[1:])
