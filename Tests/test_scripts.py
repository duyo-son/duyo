"""빌드 실패 시 이전 앱을 설치/실행하지 않는지 실제 셸 진입점을 검사한다."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SimulatorScriptTests(unittest.TestCase):
    def run_script(self, devices):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'bin').mkdir()
            shutil.copy(ROOT / 'scripts/run-simulator.sh', root / 'scripts')
            log = root / 'calls'
            (root / 'devices.json').write_text(json.dumps({'devices': {'iOS': devices}}))
            stubs = {
                'xcodebuild': '#!/bin/sh\necho "xcodebuild $*" >> "$DUYO_COMMAND_LOG"\nif [ "$1" = "-version" ]; then exit 0; fi\necho "expected build failure" >&2\nexit 42\n',
                'xcrun': '#!/bin/sh\necho "xcrun $*" >> "$DUYO_COMMAND_LOG"\nif [ "$2" = "list" ]; then cat "$DUYO_DEVICE_LIST"; fi\n',
            }
            for name, source in stubs.items():
                path = root / 'bin' / name
                path.write_text(source)
                path.chmod(0o755)
            result = subprocess.run(['bash', str(root / 'scripts/run-simulator.sh')],
                                    capture_output=True, text=True, env={**os.environ,
                                    'PATH': str(root / 'bin') + os.pathsep + os.environ['PATH'],
                                    'SIMULATOR_UDID': '', 'DUYO_COMMAND_LOG': str(log),
                                    'DUYO_DEVICE_LIST': str(root / 'devices.json')})
            return result, log.read_text()

    def test_failed_build_never_installs_or_launches_stale_app(self):
        result, calls = self.run_script([
            {'name': 'iPad Pro', 'state': 'Booted', 'udid': 'other-device'},
            {'name': 'iPhone Duo', 'state': 'Booted', 'udid': 'duo-device'},
        ])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('expected build failure', result.stderr)
        self.assertIn('id=duo-device', calls)
        self.assertNotIn('simctl install', calls)
        self.assertNotIn('simctl launch', calls)

    def test_missing_duo_stops_before_build(self):
        result, calls = self.run_script([{'name': 'iPad Pro', 'state': 'Booted', 'udid': 'other'}])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('BLOCKED', result.stderr)
        self.assertNotIn('CODE_SIGNING_ALLOWED', calls)
