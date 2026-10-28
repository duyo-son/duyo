#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m unittest discover -s Tests -p 'test_harness.py' -q
ruby -rpsych -rjson -e '
  files = Dir[".claude/{agents,rules}/*.md", ".claude/skills/*/SKILL.md"]
  abort "설정 파일 누락" unless files.size == 11
  files.each do |path|
    text = File.read(path)
    abort "Frontmatter 누락: #{path}" unless text.start_with?("---\n")
    data = Psych.safe_load(text.split("---", 3)[1])
    if path.include?("/rules/")
      abort path unless data["paths"].is_a?(Array) && !data["paths"].empty?
    else
      abort path unless data["name"] && data["description"]
      abort path if path.include?("/agents/") && !%w[inherit haiku sonnet].include?(data["model"])
      abort path if path.include?("/skills/") && data["disable-model-invocation"] != true
    end
  end
  puts "PASS: 11개 조건부 규칙/에이전트/수동 Skill YAML"
'
