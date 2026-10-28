#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! xcodebuild -version > /dev/null 2>&1; then
  echo 'BLOCKED: 전체 Xcode를 설치하고 xcode-select에서 선택하세요. Command Line Tools만으로는 앱을 빌드할 수 없습니다.' >&2
  exit 2
fi
echo "DUYO: iPhone Duo 시뮬레이터 준비 중…"
simulator_id=$(python3 - <<'PY'
import json, os, subprocess
requested = os.environ.get('SIMULATOR_UDID')
raw = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', 'available', '-j']))
devices = [d for group in raw['devices'].values() for d in group if 'Duo' in d['name']]
if requested:
    devices = [d for d in devices if d['udid'] == requested]
else:
    booted = [d for d in devices if d['state'] == 'Booted']
    devices = booted or devices
if len(devices) != 1:
    raise SystemExit('BLOCKED: 사용 가능한 iPhone Duo 한 대가 필요합니다. 여러 대면 SIMULATOR_UDID를 지정하세요. 런타임이 없으면 Xcode에서 설치하세요.')
device = devices[0]
if device['state'] != 'Booted':
    subprocess.run(['xcrun', 'simctl', 'boot', device['udid']], check=True)
subprocess.run(['xcrun', 'simctl', 'bootstatus', device['udid'], '-b'], check=True, stdout=subprocess.DEVNULL)
print(device['udid'])
PY
)
mkdir -p artifacts
log_path=artifacts/run-simulator-build.log
echo "DUYO: 앱 빌드 중… ($log_path)"
if ! xcodebuild -project DUYO/DUYO.xcodeproj -scheme DUYO -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath artifacts/DerivedData CODE_SIGNING_ALLOWED=NO build > "$log_path" 2>&1; then
  tail -n 35 "$log_path" >&2
  exit 1
fi
app_path="$PWD/artifacts/DerivedData/Build/Products/Debug-iphonesimulator/DUYO.app"
bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Info.plist")
xcrun simctl install "$simulator_id" "$app_path"
open -a DeviceHub
xcrun simctl launch --terminate-running-process "$simulator_id" "$bundle_id"
echo "PASS: DUYO 빌드·설치·실행 완료. 로그: $log_path"
