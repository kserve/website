#!/usr/bin/env python3

# Copyright 2026 The KServe Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Check links in the built site: scan a build offline, then gate or audit it."""

import argparse
import json
import os
import signal
from datetime import datetime, timezone
from pathlib import Path

from linkcheck.api import GitHubAPI
from linkcheck.history import by_target
from linkcheck.policy import Checker, canonical_url, exceptions, online
from linkcheck.site import Site, fold
from linkcheck.validation import CONTROL, DETAIL_LIMIT, read_json


ROOT = Path(__file__).resolve().parents[1]


def scan(args):
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    checker = Checker(args.lychee, output.parent)
    facts = Site(args.site, args.root, checker).scan()
    output.write_text(json.dumps(facts, indent=2) + "\n")
    print(
        f"Scanned {facts['pages']} pages: {len(facts['local'])} local findings, "
        f"{len(facts['external'])} external URLs",
        flush=True,
    )
    return 0


def load_facts(path):
    facts = read_json(path)
    if (
        not isinstance(facts, dict)
        or facts.get("version") != 1
        or not isinstance(facts.get("pages"), int)
        or not isinstance(facts.get("local"), list)
        or not isinstance(facts.get("external"), dict)
    ):
        raise ValueError(f"Unsupported link facts in {path}")
    for item in facts["local"]:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("url"), str)
            or item.get("status") not in ("missing", "unknown")
            or not isinstance(item.get("detail"), str)
            or not isinstance(item.get("source"), dict)
            or not isinstance(item.get("key"), list)
            or len(item["key"]) != 2
            or not all(isinstance(part, str) for part in item["key"])
        ):
            raise ValueError(f"Invalid local finding in {path}")
    return facts


def location(source):
    return source["path"] + (f":{source['line']}" if source.get("line") else "")


def inert(detail):
    """Fit text to the observation rules; Lychee errors embed the whole URL."""
    detail = CONTROL.sub(" ", detail)
    return detail if len(detail) <= DETAIL_LIMIT else detail[: DETAIL_LIMIT - 1] + "…"


def exception_keys(url):
    """Exception entries that can cover url: exact, or every docs version via {v}."""
    if url.startswith(("http://", "https://")):
        return [canonical_url(url)]
    if url.startswith("site:"):
        return [url, "site:" + fold(url[len("site:") :])]
    return [url]


def gate(args):
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    # A failed invocation must not leave a previous complete audit available
    # to a local triage command as if it were this run's result.
    (output / "observations.json").unlink(missing_ok=True)
    now = datetime.now(timezone.utc)
    ignored, expired = exceptions(
        ROOT / ".github/link-check-exceptions.json", now.date()
    )
    facts = load_facts(args.facts)
    base = load_facts(args.base_facts) if args.base_facts else None

    # Local findings are keyed by page and target with doc versions folded:
    # cutting a version or editing a page with existing debt adds no key.
    observations, local, local_unknown = [], {}, {}
    for item in facts["local"]:
        url = item["url"]
        exception = next(
            (key for key in exception_keys(url) if key in ignored), None
        )
        observations.append(
            {
                "url": url,
                "kind": "local",
                "status": "suppressed" if exception else item["status"],
                "detail": inert(ignored[exception] if exception else item["detail"]),
                "sources": [item["source"]],
            }
        )
        if exception:
            continue
        bucket = local if item["status"] == "missing" else local_unknown
        bucket.setdefault(tuple(item["key"]), {})[
            f"{location(item['source'])} → {url}"
        ] = item["detail"]
    all_local_count = len(local)
    if base is not None:
        baseline = {
            tuple(item["key"]) for item in base["local"] if item["status"] == "missing"
        }
        local = {key: value for key, value in local.items() if key not in baseline}

    confirmed, github_missing = {}, {}
    uncertain = {
        label: detail
        for entries in local_unknown.values()
        for label, detail in entries.items()
    }
    destinations = {}
    if not args.offline:
        destinations = facts["external"]
        if base is not None:
            existing = set(base["external"])
            destinations = {
                url: sources
                for url, sources in destinations.items()
                if url not in existing
            }
        checked, destinations, confirmed, github_missing, remote = online(
            Checker(args.lychee, output), ROOT, destinations, ignored, GitHubAPI()
        )
        observations += [{**item, "detail": inert(item["detail"])} for item in checked]
        uncertain.update(remote)

    audit = {
        "version": 1,
        "complete": not args.offline,
        "scope": "pr" if base is not None else "audit",
        "generated_at": now.isoformat(),
        "run_id": os.environ.get("GITHUB_RUN_ID"),
        "observations": list(by_target(observations).values()),
    }
    (output / "observations.json").write_text(json.dumps(audit, indent=2) + "\n")

    lines = [
        "# Link check",
        "",
        f"Checked {facts['pages']} built pages and "
        f"{len(destinations)} external destinations.",
        f"Local failures: {len(local)} reported ({all_local_count} total). "
        f"Verified missing GitHub targets: {len(github_missing)}. "
        f"Repeated external 404/410: {len(confirmed)}. "
        f"Inconclusive targets: {len(uncertain)}.",
        "",
    ]
    if base is not None:
        lines += [
            "Existing local failures and external URLs already in the target branch "
            "are excluded from PR failures. Local failures compare the page and the "
            "target with documentation versions folded together. The whole site is "
            "scanned, so deleting a target exposes broken links on unchanged pages.",
            "",
        ]
    if args.advisory:
        lines += [
            "Advisory audit: findings do not fail the scanner. The nightly triage "
            "job escalates local and verified GitHub failures immediately, and "
            "other missing or unreachable websites after seven days and five observations.",
            "",
        ]
    for title, entries in (
        (
            "Local link failures",
            {
                label: detail
                for entries in local.values()
                for label, detail in entries.items()
            },
        ),
        ("Verified missing GitHub files, revisions or headings", github_missing),
        ("Repeated external 404/410", confirmed),
        ("Inconclusive targets", uncertain),
    ):
        lines += [f"## {title}", ""]
        lines += [
            f"- {json.dumps(k, ensure_ascii=False)}: {v}"
            for k, v in sorted(entries.items())
        ] or ["None."]
        lines.append("")
    if expired:
        lines += ["## Expired exceptions", "", *[f"- {url}" for url in expired], ""]
    unmatched = (
        set(ignored)
        - set(facts["external"])
        - {key for item in observations for key in exception_keys(item["url"])}
    )
    if unmatched:
        lines += [
            "## Unused exceptions",
            "",
            *[f"- {url}" for url in sorted(unmatched)],
            "",
        ]
    suppressed = [
        item for item in audit["observations"] if item["status"] == "suppressed"
    ]
    if suppressed:
        lines += [
            "## Active exceptions",
            "",
            *[f"- {item['url']}: {item['detail']}" for item in suppressed],
            "",
        ]
    summary = "\n".join(lines)
    (output / "summary.md").write_text(summary)
    print(summary)
    if summary_path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(summary_path, "a") as stream:
            stream.write(summary + "\n")
    return 0 if args.advisory else int(bool(local or confirmed or github_missing))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--lychee", default="lychee")
    commands = parser.add_subparsers(dest="command", required=True)
    scanner = commands.add_parser(
        "scan",
        parents=[common],
        help="Record local failures and external URLs of one build",
    )
    scanner.add_argument("--site", type=Path, required=True, help="Build output")
    scanner.add_argument(
        "--root",
        type=Path,
        default=ROOT,
        help="Checkout the site was built from (.docusaurus and sources)",
    )
    scanner.add_argument("--output", type=Path, required=True)
    checker = commands.add_parser(
        "gate",
        parents=[common],
        help="Fail on new findings, or report all of them with --advisory",
    )
    checker.add_argument("--facts", type=Path, required=True)
    checker.add_argument(
        "--base-facts", type=Path, help="Facts from a build of the PR base"
    )
    checker.add_argument("--offline", action="store_true")
    checker.add_argument(
        "--advisory", action="store_true", help="Report debt without failing"
    )
    checker.add_argument("--output", type=Path, default=ROOT / "bin/link-check")
    args = parser.parse_args()
    return scan(args) if args.command == "scan" else gate(args)


def terminate(signum, frame):
    raise SystemExit(128 + signum)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, terminate)
    raise SystemExit(main())
