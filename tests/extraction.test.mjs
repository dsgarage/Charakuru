import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {root} from '../custom/release.mjs';
const exec = promisify(execFile);
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const buildArchive = `import sys, zipfile, stat
with zipfile.ZipFile(sys.argv[1], 'w') as z:
    z.writestr('kit/RELEASE-MANIFEST.json', '{}')
    if sys.argv[2] == 'safe':
        z.writestr('kit/public/app.js', 'safe')
    elif sys.argv[2] == 'traversal':
        z.writestr('kit/../../outside', 'unsafe')
    elif sys.argv[2] == 'link':
        i = zipfile.ZipInfo('kit/link')
        i.create_system = 3
        i.external_attr = (stat.S_IFLNK | 0o777) << 16
        z.writestr(i, '../../outside')
    elif sys.argv[2] == 'duplicate':
        z.writestr('kit/file', 'first')
        z.writestr('kit/FILE', 'second')
`;
test('公式ZIPのルート階層を平坦化し、危険なパス・リンク・重複を拒否する', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'charakuru-zip-'));
  t.after(() => fs.rm(temp, {recursive: true, force: true}));
  for (const kind of ['safe', 'traversal', 'link', 'duplicate']) {
    const archive = path.join(temp, `${kind}.zip`), output = path.join(temp, kind);
    await exec(python, ['-c', buildArchive, archive, kind]);
    const extract = () => exec(python, [path.join(root, 'custom/extract.py'), archive, output]);
    if (kind === 'safe') {
      await extract();
      assert.equal(await fs.readFile(path.join(output, 'public/app.js'), 'utf8'), 'safe');
    } else await assert.rejects(extract(), /不正なZIPエントリー|重複したZIPエントリー/);
  }
  await assert.rejects(fs.access(path.join(temp, 'outside')));
});
