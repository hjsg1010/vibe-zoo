#!/usr/bin/env python3
"""Verify installed workflow bytes against the supplied AI-DLC v1.0.1 manifest."""
from hashlib import sha256
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
manifest = root / "reference/upstream/ai-dlc-rules-v1.0.1.sha256"
expected = {}
for line in manifest.read_text().splitlines():
    checksum, source = line.split()
    if source.startswith("aws-aidlc-rule-details/"):
        target = ".aidlc-rule-details/" + source.removeprefix("aws-aidlc-rule-details/")
    elif source == "aws-aidlc-rules/core-workflow.md":
        target = "CLAUDE.md"
    else:
        raise ValueError(f"Unexpected manifest path: {source}")
    if target in expected:
        raise ValueError(f"Duplicate manifest entry: {target}")
    expected[target] = checksum
errors = []
for target, checksum in expected.items():
    path = root / target
    if not path.is_file():
        errors.append(f"MISSING {target}")
    elif sha256(path.read_bytes()).hexdigest() != checksum:
        errors.append(f"MODIFIED {target}")
actual_details = {
    p.relative_to(root).as_posix()
    for p in (root / ".aidlc-rule-details").rglob("*") if p.is_file()
}
extra = actual_details - set(expected)
errors.extend(f"EXTRA {target}" for target in sorted(extra))
if len(expected) != 32:
    errors.append(f"Expected 32 rules, manifest contains {len(expected)}")
if (root / "reference/upstream/VERSION").read_text().strip() != "1.0.1":
    errors.append("VERSION mismatch")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print("OK: 32 upstream files verified (31 rule details + CLAUDE.md), AI-DLC v1.0.1")
