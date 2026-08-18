from pathlib import Path 

from backend.services.rule_loader import RuleLoader

loader = RuleLoader(
    Path("backend/rules/secret_patterns.json")
)

rules=loader.load()
print(f"Loaded Rules: {len(rules)}\n")

for rule in rules:
    print(
        rule.id,
        rule.name,
        rule.severity,
        )