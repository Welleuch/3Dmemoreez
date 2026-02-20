"""
Fix incorrectly generated absolute imports that include '.__init__' in the middle.
E.g.: from hy3dgen.shapegen.models.__init__.conditioner import ...
Should be: from hy3dgen.shapegen.models.conditioner import ...
"""

import os
import re

ROOT_PKG = "hy3dgen"
ROOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ROOT_PKG)


def fix_init_in_import(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    # Replace any occurrence of .__init__. with just .
    new_content = content.replace(".__init__.", ".")
    # Also fix if it ends with .__init__ (unlikely but safe)
    new_content = new_content.replace(".__init__ ", " ")

    if new_content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"FIXED .__init__. in: {filepath}")
        return True
    return False


def walk_python_files(directory):
    for dirpath, dirnames, filenames in os.walk(directory):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for filename in filenames:
            if filename.endswith(".py"):
                yield os.path.join(dirpath, filename)


def main():
    fixed = 0
    for filepath in walk_python_files(ROOT_DIR):
        if fix_init_in_import(filepath):
            fixed += 1
    print(f"\nFixed .__init__. artifacts in {fixed} files.")


if __name__ == "__main__":
    main()
