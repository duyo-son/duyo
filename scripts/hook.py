#!/usr/bin/env python3
"""DUYO의 가벼운 Claude Code Hook. 셸 샌드박스를 대신하지 않는다."""
import json
import os
from pathlib import Path
import shlex
import sys


def blocked(command):
    # shortcut: 단순 명령과 셸 체인만 검사한다. 간접 실행 격리는 OS 샌드박스가 필요하다.
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|")
        lexer.whitespace_split = True
        chunks = [[]]
        for token in lexer:
            if token in (";", "&&", "||", "|", "&"):
                chunks.append([])
            else:
                chunks[-1].append(token)
    except ValueError:
        return False
    return any(blocked_chunk(parts) for parts in chunks)


def blocked_chunk(parts):
    if parts[:2] == ["git", "reset"] and "--hard" in parts[2:]:
        return True
    if parts[:2] == ["git", "clean"] and any(
        p.startswith("-") and "f" in p and "d" in p for p in parts[2:]
    ):
        return True
    if parts and parts[0] == "rm":
        flags = "".join(p for p in parts[1:] if p.startswith("-"))
        if "r" in flags.lower() and "f" in flags:
            return any(p in ("/", ".", ".git", "./.git") for p in parts[1:])
    return False


def run(event, root):
    name = event.get("hook_event_name")
    if name == "SessionStart":
        state = root / "docs/harness/STATE.md"
        print("DUYO 상태: docs/harness/STATE.md · Python/Node 검사: bash scripts/harness-smoke.sh")
        if state.exists():
            print("\n".join(state.read_text().splitlines()[:24]))
    elif name == "PreToolUse" and event.get("tool_name") == "Bash":
        if blocked(event.get("tool_input", {}).get("command", "")):
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PreToolUse", "permissionDecision": "deny",
                "permissionDecisionReason": "DUYO: 작업 손실 가능한 직접 파괴 명령 차단. 변경을 보존하고 개별 파일 작업을 사용하세요."
            }}, ensure_ascii=False))
    elif name == "PostToolUse":
        path = Path(event.get("tool_input", {}).get("file_path", ""))
        if not path.is_absolute():
            path = root / path
        path = path.resolve()
        if root in path.parents and path.suffix == ".json" and path.is_file():
            try:
                json.loads(path.read_text())
            except (ValueError, UnicodeError) as error:
                print(json.dumps({"decision": "block", "reason": f"JSON 구문 오류: {path.name}: {error}"}, ensure_ascii=False))


if __name__ == "__main__":
    run(json.load(sys.stdin), Path(os.environ.get("CLAUDE_PROJECT_DIR", Path(__file__).resolve().parents[1])).resolve())
