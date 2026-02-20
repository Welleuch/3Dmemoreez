"""
Script to convert all relative imports in the hy3dgen package to absolute imports.
Run from the ai_engine directory (or anywhere with the full path specified).

Usage: python fix_relative_imports.py
"""

import os
import re
import sys

ROOT_PKG = "hy3dgen"  # the top-level package name
ROOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ROOT_PKG)


def get_package_name(filepath):
    """Given a file path inside the hy3dgen dir, return its dotted package name."""
    rel = os.path.relpath(filepath, os.path.dirname(ROOT_DIR))
    rel = rel.replace("\\", "/")
    # Remove .py extension
    if rel.endswith(".py"):
        rel = rel[:-3]
    # Convert to dotted
    parts = rel.split("/")
    # If the last part is __init__, remove it — the package IS the directory
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def resolve_relative_import(from_dots, from_name, current_pkg):
    """
    Convert a relative import to absolute.

    from_dots: number of leading dots (1 = same package, 2 = parent, etc.)
    from_name: the name after the dots (may be empty for 'from . import X')
    current_pkg: dotted package of the current file
    """
    parts = current_pkg.split(".")
    # Go up (dots - 1) levels from the current package
    # 1 dot = current package, 2 dots = parent package, etc.
    go_up = from_dots - 1
    if go_up < 0:
        go_up = 0
    if go_up > 0:
        parts = parts[:-go_up]
    abs_pkg = ".".join(parts)
    if from_name:
        return abs_pkg + "." + from_name if abs_pkg else from_name
    return abs_pkg


def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    pkg_name = get_package_name(filepath)
    # For non-__init__ files, get_package_name returns the module name (e.g. hy3dgen.shapegen.models.conditioner)
    # We need the package (parent) of that module for relative import resolution
    # For __init__.py, get_package_name already returns the package (e.g. hy3dgen.shapegen.models)
    filename = os.path.basename(filepath)
    if filename != "__init__.py":
        # Strip the last component (module name) to get the package
        parts = pkg_name.split(".")
        pkg_name = ".".join(parts[:-1]) if len(parts) > 1 else pkg_name

    original = content

    # Pattern: from ...X import Y  or  from ... import Y
    # Matches: from <dots><optional_name> import
    pattern = re.compile(
        r'^([ \t]*from\s+)(\.+)([a-zA-Z0-9_.]*)\s+(import\s+)',
        re.MULTILINE
    )

    def replace_relative(m):
        indent = m.group(1)  # 'from ' possibly with indent
        dots = m.group(2)    # '.' or '..' or '...' etc.
        name = m.group(3)    # module name after dots (may be empty)
        imp = m.group(4)     # 'import '

        num_dots = len(dots)
        abs_name = resolve_relative_import(num_dots, name, pkg_name)
        return f"{indent}{abs_name} {imp}"

    new_content = pattern.sub(replace_relative, content)

    if new_content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"FIXED: {filepath}")
        return True
    return False


def walk_python_files(directory):
    for dirpath, dirnames, filenames in os.walk(directory):
        # Skip __pycache__
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for filename in filenames:
            if filename.endswith(".py"):
                yield os.path.join(dirpath, filename)


def main():
    fixed = 0
    scanned = 0
    for filepath in walk_python_files(ROOT_DIR):
        scanned += 1
        if fix_file(filepath):
            fixed += 1
    print(f"\nScanned {scanned} files, fixed {fixed} files.")
    print("Done! All relative imports have been converted to absolute imports.")


if __name__ == "__main__":
    main()
