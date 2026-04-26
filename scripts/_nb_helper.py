"""Helper to programmatically build and execute Jupyter notebooks.

Usage from another script:

    from _nb_helper import md, code, build_notebook, execute_notebook

    cells = [md("# Title"), code("print('hi')")]
    build_notebook(cells, "path/to/nb.ipynb")
    execute_notebook("path/to/nb.ipynb")
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import nbformat
from nbformat.v4 import new_code_cell, new_markdown_cell, new_notebook


def md(src: str):
    return new_markdown_cell(src)


def code(src: str):
    return new_code_cell(src)


def build_notebook(cells, path: str | Path) -> Path:
    nb = new_notebook()
    nb["cells"] = list(cells)
    nb["metadata"] = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {
            "name": "python",
            "version": "3.11",
        },
    }
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        nbformat.write(nb, f)
    return p


def execute_notebook(path: str | Path, timeout: int = 600) -> None:
    """Execute the notebook in-place using nbclient (no jupyter CLI needed)."""
    from nbclient import NotebookClient

    p = Path(path)
    print(f"Executing {p.name}...")
    nb = nbformat.read(p, as_version=4)
    client = NotebookClient(
        nb,
        timeout=timeout,
        kernel_name="python3",
        resources={"metadata": {"path": str(p.parent)}},
    )
    client.execute()
    nbformat.write(nb, p)
    print(f"  -> {p}")
