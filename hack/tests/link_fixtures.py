"""Shared inputs for exercising the real scanner and issue policy."""

from contextlib import contextmanager, redirect_stdout
from functools import partial
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from linkcheck.notifications import plan_issue

ROOT = Path(__file__).resolve().parents[2]
LYCHEE = Path(os.environ.get("LYCHEE_TEST_BINARY", ROOT / "bin/lychee"))
plan = partial(plan_issue, repository="kserve/website", sha="abc", run_url=None)


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "hack" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


links = load_script("check-links")


def write_files(root, files):
    for name, content in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)


def doc(body, edit=None):
    """A built doc page: theme chrome and navigation around the content region."""
    footer = (
        f'<footer class="theme-doc-footer"><a class="theme-edit-this-page" href="{edit}">Edit this page</a></footer>'
        if edit
        else ""
    )
    return (
        '<!doctype html><html><head><link rel="canonical" href="/website/head-only">'
        "</head><body>"
        '<nav class="theme-layout-navbar navbar"><a href="/website/chrome-only">Docs</a></nav>'
        '<aside class="theme-doc-sidebar-container"><a href="/website/sidebar-only">Item</a></aside>'
        '<main class="docMainContainer"><article>'
        '<nav class="theme-doc-breadcrumbs"><a href="/website/breadcrumb-only">Home</a></nav>'
        f'<div class="theme-doc-markdown markdown">{body}</div>{footer}'
        '<nav class="pagination-nav"><a href="/website/pagination-only">Next</a></nav>'
        "</article></main>"
        '<div class="theme-doc-toc-desktop"><ul class="table-of-contents"><li><a href="#toc-only">TOC</a></li></ul></div>'
        '<footer class="theme-layout-footer footer"><a href="/website/footer-only">Blog</a></footer>'
        "</body></html>"
    )


SITE = {
    "url": "https://kserve.github.io",
    "baseUrl": "/website/",
    "trailingSlash": False,
}


@contextmanager
def checkout(pages=None, files=None, config=None):
    """A source checkout with a production build in build/."""
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        write_files(
            root,
            {
                ".docusaurus/docusaurus.config.mjs": "/* generated */\nexport default "
                + json.dumps({**SITE, **(config or {})}, indent=2)
                + ";\n",
                ".github/link-check-exceptions.json": '{"version":1,"exceptions":[]}',
                "docusaurus.config.ts": "export default {};\n",
                **{f"build/{name}": content for name, content in (pages or {}).items()},
                **(files or {}),
            },
        )
        yield root


def succeed(name, inputs):
    return {
        "success_map": {
            "stdin": [
                {"url": url, "status": {"code": 200, "text": "OK"}} for url in inputs
            ]
        }
    }


def run_check(head, base=None, api=None, *, http=None, offline=False, advisory=False):
    """Scan each build, then gate through the real CLI with fake HTTP and API."""
    for root in (base, head):
        if root is not None:
            argv = [
                "check-links.py",
                "scan",
                "--lychee",
                str(LYCHEE),
                "--site",
                str(root / "build"),
                "--root",
                str(root),
                "--output",
                str(root / "report/facts.json"),
            ]
            with patch.object(sys, "argv", argv), redirect_stdout(io.StringIO()):
                assert links.main() == 0
    args = [
        "check-links.py",
        "gate",
        "--lychee",
        str(LYCHEE),
        "--facts",
        str(head / "report/facts.json"),
        "--output",
        str(head / "report"),
    ]
    if base is not None:
        args += ["--base-facts", str(base / "report/facts.json")]
    if offline:
        args.append("--offline")
    if advisory:
        args.append("--advisory")
    original, calls = links.Checker.run, []

    def run(checker, root, options, *, inputs=None, name=None):
        if name in ("external", "external-recheck"):
            # Unit tests never reach the network.
            calls.append((name, inputs))
            return (http or succeed)(name, inputs) if inputs else {}
        return original(checker, root, options, inputs=inputs, name=name)

    with (
        patch.object(links, "ROOT", head),
        patch.object(links, "GitHubAPI", return_value=api or API()),
        patch.object(links.Checker, "run", run),
        patch.object(sys, "argv", args),
        redirect_stdout(io.StringIO()),
    ):
        code = links.main()
    report = json.loads((head / "report/observations.json").read_text())
    return code, report, calls


class API:
    def __init__(self, *, repository=200, refs=None, content=None, rename=None):
        self.repository = repository
        self.refs = refs if refs is not None else ["main"]
        self.content = content if content is not None else (404, {})
        self.calls = []
        self.rename = rename

    def get(self, path):
        self.calls.append(path)
        if "/branches/" in path:
            return (
                (200, {"name": self.rename})
                if self.rename and path.endswith("/master")
                else (404, {})
            )
        if "/git/matching-refs/" in path:
            namespace = "heads" if "/heads/" in path else "tags"
            return 200, [{"ref": f"refs/{namespace}/{ref}"} for ref in self.refs]
        if "/contents/" in path or path.endswith("/contents"):
            if isinstance(self.content, list):
                return self.content.pop(0)
            return self.content
        return self.repository, {"default_branch": "main", "private": False}


def observation(
    status="missing", kind="external", url="https://site.invalid/doc", sources=None
):
    return {
        "url": url,
        "kind": kind,
        "status": status,
        "detail": status,
        "sources": sources or [],
    }


def report(*items, stamp=None):
    return {
        "version": 1,
        "scope": "audit",
        "complete": True,
        "observations": list(items),
        **({"generated_at": stamp} if stamp else {}),
    }


def audit(status="missing", stamp=None, kind="external"):
    return report(observation(status, kind), stamp=stamp)


def timed_audit(status="missing", stamp="2026-01-01T12:00:00+00:00", kind="external"):
    return audit(status, stamp, kind)


def item(status="missing"):
    return observation(
        status,
        kind="github",
        url="https://github.com/other/repo/blob/main/doc.md",
        sources=[{"path": "README.md", "line": 7}],
    )


def issue(body, status="open"):
    return {"number": 42, "body": body, "state": status}
