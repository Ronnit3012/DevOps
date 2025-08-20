#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path
from datetime import datetime

REPORTS_FILE = Path("reports/maintainability.json")

def run_radon():
    """Run radon and return parsed JSON output."""
    result = subprocess.run(
        ["radon", "mi", "-j", "src"],  # change "src" if needed
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

def append_or_replace_report(version: str, replace: bool):
    """Append or replace report for given version."""
    REPORTS_FILE.parent.mkdir(exist_ok=True)
    
    # Load existing reports if file exists
    if REPORTS_FILE.exists():
        with REPORTS_FILE.open("r") as f:
            try:
                reports = json.load(f)
            except json.JSONDecodeError:
                reports = []
    else:
        reports = []

    # Generate new report
    new_report = {
        "version": version,
        "timestamp": datetime.utcnow().isoformat(),
        "data": run_radon()
    }

    if replace:
        # Remove any existing entry with this version
        reports = [r for r in reports if r.get("version") != version]

    reports.append(new_report)

    # Save back to file
    with REPORTS_FILE.open("w") as f:
        json.dump(reports, f, indent=2)

    print(f"✅ Report for version {version} {'replaced' if replace else 'appended'}.")

def main():
    parser = argparse.ArgumentParser(description="Generate maintainability report.")
    parser.add_argument("--version", required=True, help="Package version (e.g., 1.2.3)")
    parser.add_argument("--replace", action="store_true", help="Replace existing version entry instead of appending")
    args = parser.parse_args()

    append_or_replace_report(args.version, args.replace)

if __name__ == "__main__":
    main()
