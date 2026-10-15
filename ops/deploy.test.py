"""Isolated deploy/rollback checks; no system services or production paths used."""
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('deploy.sh').resolve()
SHA = 'a' * 40

class DeployTests(unittest.TestCase):
    def run_case(self, failure=None):
        with tempfile.TemporaryDirectory(prefix='karta-deploy-test-') as root:
            root = Path(root)
            source, base, shim = (root / name for name in ('source', 'base', 'bin'))
            for directory in (source, base / 'releases' / 'old', shim):
                directory.mkdir(parents=True)
            (base / 'releases' / 'old' / 'release.json').write_text('{"commit":"old"}')
            (base / 'current').symlink_to(base / 'releases' / 'old')
            bundle = root / 'source.tar'
            with tarfile.open(bundle, 'w') as archive:
                item = tarfile.TarInfo('server/telegram-auth-server.mjs')
                item.size = 0
                archive.addfile(item, io.BytesIO())
            program = '''#!/usr/bin/env python3
import os, pathlib, sys
name=pathlib.Path(sys.argv[0]).name
args=sys.argv[1:]
with open(os.environ['TEST_LOG'],'a') as log:log.write(name+' '+ ' '.join(args)+'\\n')
failure=os.environ.get('TEST_FAILURE','')
if name=='git':
 if args[0]=='rev-parse':print('a'*40)
 if args[0]=='archive':sys.stdout.buffer.write(pathlib.Path(os.environ['TEST_TAR']).read_bytes())
if name=='npm' and args[0]==failure:sys.exit(1)
if name=='node' and args and args[0]=='ops/migrate.mjs' and failure=='migration':sys.exit(1)
if name=='curl' and failure=='health':sys.exit(1)
if name=='systemctl' and failure=='restart':
 marker=pathlib.Path(os.environ['TEST_MARKER'])
 if not marker.exists():marker.write_text('attempted');sys.exit(1)
'''
            for name in ('git', 'npm', 'npx', 'node', 'curl', 'systemctl', 'sleep'):
                path = shim / name
                path.write_text(program)
                path.chmod(0o755)
            log = root / 'log'
            env = {**os.environ, 'PATH': str(shim)+os.pathsep+os.environ['PATH'],
                   'KARTA_DEPLOY_SOURCE': str(source), 'KARTA_DEPLOY_BASE': str(base),
                   'KARTA_DEPLOY_LOCK': str(root/'lock'), 'TEST_LOG': str(log),
                   'TEST_TAR': str(bundle), 'TEST_MARKER': str(root/'marker'),
                   'TEST_FAILURE': failure or ''}
            # Configuration chmod/chown target only the fake local directory.
            script = SCRIPT.read_text().replace('/etc/kartakontenta', str(root/'configuration'))
            configuration = root/'configuration'
            configuration.mkdir()
            (configuration/'runtime.env').touch()
            # chown is host-specific; isolate it too.
            path = shim/'chown'; path.write_text('#!/bin/sh\nexit 0\n'); path.chmod(0o755)
            result = subprocess.run(['bash', '-c', script], env=env, capture_output=True, timeout=20)
            return result.returncode, (base/'current').resolve().name, log.read_text()

    def test_success_checks_before_switch(self):
        status, current, log = self.run_case()
        self.assertEqual((status, current), (0, SHA))
        self.assertLess(log.index('npm audit'), log.index('ops/backup.mjs create'))
        self.assertLess(log.index('ops/backup.mjs create'), log.index('ops/migrate.mjs'))
        self.assertEqual(log.count('systemctl restart'), 1)

    def test_preflight_failure_preserves_current(self):
        for failure in ('ci', 'audit', 'test', 'migration'):
            with self.subTest(failure=failure):
                status, current, log = self.run_case(failure)
                self.assertNotEqual(status, 0)
                self.assertEqual(current, 'old')
                self.assertNotIn('systemctl restart', log)

    def test_restart_failure_rolls_back(self):
        status, current, log = self.run_case('restart')
        self.assertNotEqual(status, 0)
        self.assertEqual(current, 'old')
        self.assertEqual(log.count('systemctl restart'), 2)

    def test_health_failure_rolls_back(self):
        status, current, log = self.run_case('health')
        self.assertNotEqual(status, 0)
        self.assertEqual(current, 'old')
        self.assertEqual(log.count('systemctl restart'), 2)

if __name__ == '__main__':
    unittest.main()
