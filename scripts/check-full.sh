#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/check-fast.sh
bash scripts/run-simulator.sh
python3 Tests/duo_poc.py
echo 'PASS: PoC 빌드·설치·Safari 통합 검사. 건너뛴 항목은 미검증이며 출시 검증을 대신하지 않습니다.'
