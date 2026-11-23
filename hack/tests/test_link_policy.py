"""HTTP evidence, exceptions and the Lychee runner shared with kserve/kserve."""

from datetime import date
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from link_fixtures import LYCHEE
from linkcheck import policy


def http_report(url, code=None, *, timeout=False):
    entry = {"url": url, "status": {"text": "failed", "code": code}}
    bucket = "timeout_map" if timeout else "success_map" if code == 200 else "error_map"
    return {bucket: {"README.md": [entry]}}


class LinkPolicyTests(unittest.TestCase):
    def test_exception_expiry_and_invalid_entries(self):
        entry = {
            "url": "https://test.invalid/a",
            "reason": "temporary",
            "expires": "2026-10-01",
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "exceptions.json"

            def check(entries, today=date(2026, 10, 1)):
                path.write_text(json.dumps({"version": 1, "exceptions": entries}))
                return policy.exceptions(path, today)

            self.assertEqual(check([entry]), ({entry["url"]: "temporary"}, []))
            self.assertEqual(check([entry], date(2026, 10, 2)), ({}, [entry["url"]]))
            for entries in (
                [{**entry, "reason": None}],
                [{**entry, "expires": "invalid"}],
                [{**entry, "expires": "9999-12-31"}],
                [entry, entry],
                [{key: value for key, value in entry.items() if key != "reason"}],
            ):
                with self.subTest(entries=entries), self.assertRaises(ValueError):
                    check(entries)

    def test_general_fragments_share_history_but_github_headings_are_distinct(self):
        self.assertEqual(
            policy.canonical_url("https://test.invalid/a#heading"),
            "https://test.invalid/a",
        )
        url = "https://github.com/other/repo/blob/main/doc.md#heading"
        self.assertEqual(policy.canonical_url(url), url)

    def test_http_outcomes_require_explicit_evidence(self):
        url = "https://test.invalid/a"
        cases = [(code, code, "restricted") for code in (401, 403, 429)]
        cases += [(code, code, "unreachable") for code in (500, 503, None)]
        cases += [
            (404, 404, "missing"),
            (410, 410, "missing"),
            (404, 503, "unreachable"),
            (404, 200, "ok"),
            (503, 200, "ok"),
            (200, "absent", "ok"),
            (404, "absent", "unknown"),
            ("absent", "absent", "unknown"),
        ]
        for first, second, expected in cases:
            with self.subTest(first=first, second=second):
                result = policy.external_observations(
                    {url},
                    {} if first == "absent" else http_report(url, first),
                    {} if second == "absent" else http_report(url, second),
                )
                self.assertEqual(result[0]["status"], expected)
        timed_out = http_report(url, timeout=True)
        self.assertEqual(
            policy.external_observations({url}, timed_out, timed_out)[0]["status"],
            "unreachable",
        )
        truncated = http_report(url.rstrip("a"), 200)
        self.assertEqual(
            policy.external_observations({url}, truncated, {})[0]["status"], "unknown"
        )

    def test_results_are_mapped_back_to_the_requested_url(self):
        inputs = ["https://cncf.io", "https://example.com/x"]
        normalized = {
            "success_map": {
                "stdin": [
                    {"url": "https://cncf.io/", "span": {"line": 1}, "status": {}}
                ]
            },
            "excluded_map": {
                "stdin": [
                    {"url": "https://example.com/x", "span": {"line": 2}, "status": {}}
                ]
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            checker = policy.Checker(str(LYCHEE), Path(directory))
            with patch.object(checker, "_run", return_value=normalized):
                result = checker.run(
                    Path(directory),
                    ["--format", "json"],
                    inputs=inputs,
                    name="external",
                )
        self.assertEqual(result["success_map"]["stdin"][0]["url"], "https://cncf.io")
        self.assertEqual(
            result["excluded_map"]["stdin"][0]["url"], "https://example.com/x"
        )

    def test_lychee_process_does_not_receive_the_api_token(self):
        result = subprocess.CompletedProcess(
            [], 0, '{"error_map":{},"timeout_map":{}}', ""
        )
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.dict(
                os.environ, {"GITHUB_TOKEN": "sensitive", "GH_TOKEN": "sensitive"}
            ),
            patch.object(policy.subprocess, "run", return_value=result) as run,
        ):
            root = Path(directory)
            policy.Checker(str(LYCHEE), root).run(
                root,
                ["--format", "json"],
                inputs=["https://www.python.org/"],
                name="external",
            )
        self.assertNotIn("GITHUB_TOKEN", run.call_args.kwargs["env"])
        self.assertNotIn("GH_TOKEN", run.call_args.kwargs["env"])


@unittest.skipUnless(LYCHEE.is_file(), "Install Lychee with make lychee")
class LycheeTests(unittest.TestCase):
    def test_fetched_headings_are_checked_with_lychee(self):
        with tempfile.TemporaryDirectory() as directory:
            checker = policy.Checker(str(LYCHEE), Path(directory))
            for heading, expected in (
                ("existing-heading", "ok"),
                ("missing-heading", "missing"),
            ):
                self.assertEqual(
                    checker.fragment("# Existing heading\n", ".md", heading), expected
                )

    def test_stdin_markdown_preserves_punctuation_in_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            urls = {f"https://www.python.org/end{suffix}" for suffix in (".", "!", "~")}
            self.assertEqual(
                policy.Checker(str(LYCHEE), root).run(
                    root, ["--dump"], inputs=sorted(urls)
                ),
                urls,
            )


if __name__ == "__main__":
    unittest.main()
