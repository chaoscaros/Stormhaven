"""Run in Blender background; exits via --python-exit-code on validation failure."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common.contracts import arguments, stage, write_json
from common.validation import open_source, inspect


def main():
    for entry in arguments('Validate real Blender sources without exporting'):
        open_source(entry)
        _, report = inspect(entry)
        write_json(stage(entry, '.validation.json'), report)
        print(report)


if __name__ == '__main__':
    main()
