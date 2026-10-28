import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("hook", ROOT / "scripts/hook.py")
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


class HarnessTests(unittest.TestCase):
    def invoke(self, event, root=ROOT):
        result = subprocess.run(
            ["python3", str(ROOT / "scripts/hook.py")], input=json.dumps(event),
            text=True, capture_output=True, check=True,
            env={**os.environ, "CLAUDE_PROJECT_DIR": str(root)},
        )
        return result.stdout

    def test_settings(self):
        settings = json.loads((ROOT / ".claude/settings.json").read_text())
        self.assertTrue(settings["enabledPlugins"]["ponytail@ponytail"])
        self.assertEqual(settings["env"]["PONYTAIL_DEFAULT_MODE"], "full")
        for event in ("SessionStart", "PreToolUse", "PostToolUse"):
            config = settings["hooks"][event][0]["hooks"][0]
            self.assertEqual(config["type"], "command")
            self.assertIn("$CLAUDE_PROJECT_DIR/scripts/hook.py", config["command"])
        self.assertLessEqual(len((ROOT / "CLAUDE.md").read_text().splitlines()), 100)

    def test_destructive_commands(self):
        for command in ("git reset --hard HEAD", "git clean -fdx", "rm -rf .git", "rm -rf /", "rm -r -f ."):
            with self.subTest(command=command):
                result = json.loads(self.invoke({"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": command}}))
                self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_normal_commands(self):
        for command in ("git status --short", "git diff", "git clean -nd", "rm -rf artifacts/DerivedData", "echo 'git reset --hard'", "node --test Tests/a.test.js"):
            self.assertFalse(hook.blocked(command), command)

    def test_shell_chains(self):
        for command in ("cd . && rm -rf .git", "git status;git reset --hard HEAD", "echo ok || git clean -fd", "echo ok | rm -rf .git"):
            self.assertTrue(hook.blocked(command), command)
        for command in ("cd . && git status", "echo 'git reset --hard'", "git diff; node --version"):
            self.assertFalse(hook.blocked(command), command)

    def test_session_resume(self):
        text = self.invoke({"hook_event_name": "SessionStart"})
        self.assertIn("DUYO", text)
        self.assertIn("Phase", text)
        self.assertLess(len(text.splitlines()), 27)

    def test_post_edit_json(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            path = root / "settings.json"
            path.write_text("{")
            event = {"hook_event_name": "PostToolUse", "tool_input": {"file_path": str(path)}}
            self.assertEqual(json.loads(self.invoke(event, root))["decision"], "block")
            path.write_text('{"ok": true}')
            self.assertEqual(self.invoke(event, root), "")
            path.unlink()
            self.assertEqual(self.invoke(event, root), "")


if __name__ == "__main__":
    unittest.main()
