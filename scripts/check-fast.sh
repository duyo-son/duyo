#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in node python3 ruby git; do
  if ! command -v "$tool" > /dev/null; then
    echo "BLOCKED: $tool 명령이 없습니다. README의 개발 도구 요구사항을 확인하세요." >&2
    exit 2
  fi
done
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  echo 'BLOCKED: Node.js 18 이상이 필요합니다.' >&2
  exit 2
fi
bash scripts/harness-smoke.sh
python3 -m unittest discover -s Tests -p "test_scripts.py" -q
if [ -d SafariWebExtension ]; then
  for path in SafariWebExtension/*.js Tests/fixture.js; do node --check "$path"; done
  python3 -m json.tool SafariWebExtension/manifest.json > /dev/null
  node --test Tests/*.test.js
fi
git diff --check
