#!/usr/bin/env python3

# Copyright 2022 The KServe Contributors
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

"""Lychee runner, HTTP evidence, exceptions and the online check phase.

Copied from kserve/kserve hack/verify-doc-links.py. VENDORED.md lists the
source line ranges and every local change.
"""

import json
import os
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote, urlsplit

from .checkout import checkout_target
from .github import GitHubVerifier, github_target, service_status


CONFIG = Path(__file__).resolve().with_name("lychee.toml")


def failures(report):
    """Lychee records timeouts separately from other failures."""
    for name in ("error_map", "timeout_map"):
        for source, entries in report.get(name, {}).items():
            for entry in entries:
                yield source, entry


def classify_external(first, confirmation):
    original = {entry["url"]: entry for _, entry in failures(first)}
    confirmed, uncertain = {}, {}
    for _, entry in failures(confirmation):
        url = entry["url"]
        if url not in original:
            continue
        if all(
            item["status"].get("code") in (404, 410) for item in (entry, original[url])
        ):
            confirmed[url] = entry["status"]["text"]
        else:
            uncertain[url] = entry["status"]["text"]
    return confirmed, uncertain


def canonical_url(url):
    # General website anchors are not verified, so their HTTP target and
    # observation history are shared. GitHub document anchors are independent.
    return url if github_target(url) else urlsplit(url)._replace(fragment="").geturl()


class Checker:
    def __init__(self, binary, output, default_branch=None):
        self.binary = str(Path(binary).resolve()) if "/" in binary else binary
        self.output = output
        self.default_branch = default_branch or os.environ.get(
            "CHECKOUT_BRANCH", os.environ.get("DEFAULT_BRANCH", "main")
        )
        self.default_branch = self.default_branch.removeprefix("refs/heads/")
        self.repository_default_branch = os.environ.get(
            "DEFAULT_BRANCH", self.default_branch
        )

    def checkout(self, url, root):
        return checkout_target(
            url,
            root,
            self.default_branch,
            default_branch=self.repository_default_branch,
        )

    def run(self, root, options, *, inputs=None, name=None):
        result = self._run(root, options, inputs, name, [], {})
        if name and inputs:
            # Inputs come from rendered HTML rather than `lychee --dump`, so
            # Lychee may report a normalized URL (https://host -> https://host/).
            # Each input is one stdin line; restore it from the entry's span.
            for map_name in ("error_map", "timeout_map", "success_map", "excluded_map"):
                for entries in result.get(map_name, {}).values():
                    for entry in entries:
                        line = (entry.get("span") or {}).get("line")
                        if type(line) is int and 1 <= line <= len(inputs):
                            entry["url"] = inputs[line - 1]
        if name:
            (self.output / f"{name}.json").write_text(
                json.dumps(result, indent=2) + "\n"
            )
        return result

    def fragment(self, content, suffix, fragment):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / ("target" + suffix)
            target.write_text(content)
            probe = root / "probe.md"
            probe.write_text(
                "[heading](<"
                + target.as_uri()
                + "#"
                + quote(fragment, safe="")
                + ">)\n"
            )
            result = self._run(
                root,
                ["--offline", "--include-fragments", "--format", "json"],
                None,
                "fragment",
                [str(probe)],
                {},
            )
            return "missing" if any(failures(result)) else "ok"

    def _run(self, root, options, inputs, name, paths, aliases):
        command = [
            self.binary,
            "--config",
            str(CONFIG),
            "--root-dir",
            str(root),
            "--no-progress",
            # No cross-run failure cache: every failure is checked afresh.
            "--cache=false",
            *(["--verbose"] if name else []),
            # Other legacy URLs (issues, pull requests, etc.) use the canonical
            # repository name to avoid false API 404s after the repository move.
            "--remap",
            r"^https://github\.com/kubeflow/kfserving/(.*)$ "
            r"https://github.com/kserve/kserve/$1",
            *options,
        ]
        if inputs is None:
            # Files are passed as arguments, so spaces and shell metacharacters
            # in PR filenames never become shell code or separate inputs.
            if not paths:
                return {} if name else set()
            command += ["--", *paths]
        else:
            if not inputs:
                return {} if name else set()
            command += ["--default-extension", "md", "--", "-"]
        if name and name != "fragment":
            print(f"Checking {name} in {root.name}", flush=True)
        completed = subprocess.run(
            command,
            cwd=root,
            input="\n".join("[target](<" + url + ">)" for url in inputs)
            if inputs is not None
            else None,
            text=True,
            capture_output=True,
            env={
                key: value
                for key, value in os.environ.items()
                if key not in ("GITHUB_TOKEN", "GH_TOKEN")
            },
        )
        if completed.returncode not in (0, 2):
            raise RuntimeError(completed.stderr or completed.stdout)
        if not name:
            return {
                line
                for line in completed.stdout.splitlines()
                if line.startswith(("http://", "https://"))
            }
        report = json.loads(completed.stdout)
        for map_name in ("error_map", "timeout_map", "success_map"):
            normalized = {}
            for source, entries in report.get(map_name, {}).items():
                normalized.setdefault(aliases.get(source, source), []).extend(entries)
            report[map_name] = normalized
            for entries in report[map_name].values():
                for entry in entries:
                    url = urlsplit(entry["url"])
                    target = url._replace(fragment="").geturl()
                    if target in aliases:
                        entry["url"] = aliases[target]
                        if url.fragment:
                            entry["url"] += "#" + url.fragment
        return report


def exceptions(path, today):
    data = json.loads(path.read_text())
    if (
        not isinstance(data, dict)
        or data.get("version") != 1
        or not isinstance(data.get("exceptions"), list)
    ):
        raise ValueError("Unsupported link exception schema")
    active, expired = {}, []
    seen = set()
    for entry in data["exceptions"]:
        if (
            not isinstance(entry, dict)
            or not isinstance(entry.get("url"), str)
            or not entry["url"]
            or not isinstance(entry.get("reason"), str)
            or not entry["reason"].strip()
            or not isinstance(entry.get("expires"), str)
        ):
            raise ValueError("Link exceptions require an exact URL and a reason")
        try:
            expiry = datetime.strptime(entry["expires"], "%Y-%m-%d").date()
        except ValueError as error:
            raise ValueError(
                "Link exceptions require an expiry in YYYY-MM-DD format"
            ) from error
        if expiry > today + timedelta(days=366):
            raise ValueError("Temporary link exceptions cannot exceed one year")
        url = entry["url"]
        key = canonical_url(url) if url.startswith(("http://", "https://")) else url
        if key in seen:
            raise ValueError("Duplicate link exception: " + key)
        seen.add(key)
        if expiry >= today:
            active[key] = entry["reason"]
        else:
            expired.append(entry["url"])
    return active, expired


def external_observations(urls, first, second):
    initial = {entry["url"]: entry for _, entry in failures(first)}
    final = {entry["url"]: entry for _, entry in failures(second)}
    succeeded_first = {
        entry["url"]
        for entries in first.get("success_map", {}).values()
        for entry in entries
    }
    succeeded_second = {
        entry["url"]
        for entries in second.get("success_map", {}).values()
        for entry in entries
    }
    confirmed, _ = classify_external(first, second)
    skipped = {
        entry["url"]
        for report in (first, second)
        for entries in report.get("excluded_map", {}).values()
        for entry in entries
    }
    result = []
    for url in sorted(urls):
        status, detail = "ok", "HTTP target verified"
        if url in skipped:
            status, detail = "unknown", "Target was excluded from HTTP verification"
        elif url in confirmed:
            status, detail = "missing", confirmed[url]
        elif url in initial and url not in succeeded_second:
            entry = final.get(url, initial[url])
            code = entry["status"].get("code")
            status = (
                "restricted"
                if code in (401, 403, 429)
                else "unknown"
                if code in (404, 410)
                else "unreachable"
            )
            detail = entry["status"]["text"]
        elif url not in succeeded_first and url not in succeeded_second:
            status, detail = "unknown", "Target was not present in the HTTP results"
        result.append(
            {"url": url, "kind": "external", "status": status, "detail": detail}
        )
    return result


def online(checker, root, destinations, ignored, api):
    """Request each destination once; GitHub targets go through the API.

    The scanner resolves same-repository GitHub links against the checkout, so
    `destinations` holds only remote targets. Returns the observations and the
    missing, GitHub-missing and inconclusive targets, keyed by URL.
    """
    observations, confirmed, github_missing, uncertain = [], {}, {}, {}
    destinations = dict(destinations)
    generic, github_urls = set(), []
    for url, sources in sorted(destinations.items()):
        if url in ignored:
            observations.append(
                {
                    "url": url,
                    "kind": "github" if github_target(url) else "external",
                    "status": "suppressed",
                    "detail": ignored[url],
                    "sources": sources,
                }
            )
        elif github_target(url):
            github_urls.append(url)
        else:
            generic.add(url)
    first = checker.run(
        root, ["--format", "json"], inputs=sorted(generic), name="external"
    )
    # `lychee --dump` never lists targets excluded by lychee.toml. These URLs
    # come from rendered HTML, so drop the ones the first request excluded.
    excluded = {
        entry["url"]
        for entries in first.get("excluded_map", {}).values()
        for entry in entries
    }
    generic -= excluded
    for url in excluded:
        destinations.pop(url, None)
    failed_urls = sorted(
        {
            entry["url"]
            for _, entry in failures(first)
            if entry["status"].get("code") in (404, 410)
        }
    )
    second = checker.run(
        root, ["--format", "json"], inputs=failed_urls, name="external-recheck"
    )
    external = external_observations(generic, first, second)
    for item in external:
        parsed = urlsplit(item["url"])
        parts = parsed.path.strip("/").split("/")
        if (
            item["status"] == "missing"
            and parsed.hostname == "github.com"
            and len(parts) >= 2
        ):
            status, metadata = api.get(
                "/repos/" + quote(parts[0], safe="") + "/" + quote(parts[1], safe="")
            )
            if status != 200 or metadata.get("private"):
                item.update(
                    status="restricted"
                    if metadata.get("private")
                    else service_status(status),
                    detail="Repository access or GitHub availability could not be verified",
                )
    verifier = GitHubVerifier(api, checker.fragment)
    for index, url in enumerate(github_urls, 1):
        print(f"Verifying GitHub target {index}/{len(github_urls)}", flush=True)
        external.append(verifier.check(url))
    for item in external:
        item["sources"] = destinations[item["url"]]
        observations.append(item)
        if item["status"] == "missing":
            (github_missing if item["kind"] == "github" else confirmed)[
                item["url"]
            ] = item["detail"]
        elif item["status"] in ("unknown", "restricted", "unreachable"):
            uncertain[item["url"]] = item["detail"]
    return observations, destinations, confirmed, github_missing, uncertain
