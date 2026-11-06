# Vendored from kserve/kserve

The verification, history and issue code is shared with the kserve/kserve
documentation link check ([kserve/kserve#6568](https://github.com/kserve/kserve/pull/6568)),
copied at `de561b1417`. Keep the copies close to the source so fixes can be
ported both ways: when resyncing, diff each file below against the new source
and expect only the listed changes. The built-site scanner (`site.py`,
`hack/check-links.py`) and `hack/tests/test_site_links.py` are website-specific.

## Copied unchanged

| Here | Source |
|---|---|
| `hack/linkcheck/github.py` | `hack/linkcheck/github.py` |
| `hack/linkcheck/history.py` | `hack/linkcheck/history.py` |
| `hack/linkcheck/persistence.py` | `hack/linkcheck/persistence.py` |
| `hack/linkcheck/lychee.toml` | `lychee.toml` |
| `hack/linkcheck/lychee-checksums.txt` | `hack/setup/cli/lychee-checksums.txt` |
| `.github/link-check-exceptions.json` | `.github/link-check-exceptions.json` |
| `hack/tests/test_link_api.py` | `hack/tests/test_link_api.py` |
| `hack/tests/test_link_history.py` | `hack/tests/test_link_history.py` |

## Copied with local changes

| Here | Source | Change and reason |
|---|---|---|
| `hack/linkcheck/__init__.py` | same | Python 3.10 guard: this repository pins no Python version. |
| `hack/linkcheck/api.py` | same, line 45 | `User-Agent: KServe-website-link-check`. |
| `hack/linkcheck/checkout.py` | same, line 27 | Same-repository set is `("kserve/website",)`; the branch comes from `CHECKOUT_BRANCH`/`DEFAULT_BRANCH`, default `main` (see `policy.py`). |
| `hack/linkcheck/validation.py` | same, line 118 | Also accepts `site:/` targets, under the same length and control-character rules. |
| `hack/linkcheck/notifications.py` | same, `MARKER` and `finding_row` | Marker `<!-- kserve-website-link-check:v1 -->`, so neither bot can adopt the other's issue. `site:/` targets render as the live URL; sources keep their blob links. A `site:/` target with `..` segments is plain text, like `repo:/`. |
| `hack/triage-doc-links.py` | same, lines 43, 45, 64-65 | Repository `kserve/website`, branch `main`. |
| `hack/linkcheck/install-lychee.sh` | `hack/setup/cli/install-lychee.sh`, lines 23-24 | Reads `LYCHEE_VERSION` from `lychee.env` beside it; default `BIN_DIR` is the repository `bin/`. |
| `hack/linkcheck/lychee.env` | `kserve-deps.env`, line 19 | Only `LYCHEE_VERSION`. |
| `hack/linkcheck/linkcheck.mk` | `Makefile.tools.mk:80-87`, `Makefile.quality.mk:173-187` | `lychee` unchanged. `check-doc-links`, `test-doc-links` and `triage-doc-links` become `check-links` (scan, then gate), `test-links` and `triage-links`; `build-site` is new. |
| `.github/workflows/check-links.yml` | same | New `build` job (head and base builds, scanned by the head scanner). `check-links` downloads the facts by name and gates them. The concurrency group includes the event, so a dispatch cannot cancel a pending nightly, and `triage` serializes on its own group with `queue: max`. `triage` otherwise differs only in the `kserve/website` guard and the note on why `issues: write` is safe. Artifact and workflow names are kept, which `persistence.py` and the triage tests rely on. |
| `hack/tests/link_fixtures.py` | same | Loads `check-links.py`; `checkout()` builds a site checkout and `run_check()` scans each build, then gates through `main()`. The HTTP fake is always on. `API`, report and issue helpers are unchanged. |
| `hack/tests/test_link_github.py` | same, line 84 | The other-organization case uses `kserve/kserve`. |
| `hack/tests/test_link_notifications.py` | same | Repository and marker constants. The wrong-repository case uses `kserve/kserve`. The targets-above-the-root case adds two `site:/` rows. |
| `hack/tests/test_link_persistence.py` | same | Repository and branch constants. |
| `hack/tests/test_link_triage.py` | same | Repository and branch constants. |
| `hack/tests/test_tool_links.py` | same, lines 18-33 | Installer, `lychee.env` and `linkcheck.mk` paths. |
| `hack/tests/test_link_policy.py` | `hack/tests/test_check_links.py:15-85, 97-110, 341-369` | Policy and Lychee runner tests against `policy.py`. The result-mapping test is new. |

## `hack/linkcheck/policy.py`

kserve keeps this logic in `hack/verify-doc-links.py`. Moving it into
`hack/linkcheck/` upstream is a follow-up; until then it is copied by range:

| Code | Source lines | Change |
|---|---|---|
| `failures` | 45-50 | none |
| `classify_external` | 70-83 | none |
| `canonical_url` | 96-99 | none |
| `Checker.__init__`, `Checker.checkout` | 133-150 | default branch `main` |
| `Checker.run` | 215-222 | No notebook inputs. Results are mapped back to the requested URL by stdin line, because inputs come from rendered HTML rather than `lychee --dump` and Lychee normalizes them (`https://host` -> `https://host/`). |
| `Checker.fragment`, `Checker._run` | 246-335 | `--config` points at `hack/linkcheck/lychee.toml`. |
| `exceptions` | 338-375 | none |
| `external_observations` | 378-421 | none |
| `online` | 495-572 (the online phase of `main`) | A function. The caller filters base-branch URLs, and the scanner resolves same-repository links, so neither happens here. URLs that Lychee excludes are dropped, as `--dump` would have. Takes the API client and returns the outcomes. |

Not copied: Markdown and notebook inventory (`document_paths`,
`documentation_inputs`, `Checker.inventory`, `Checker.local`, `local_failures`),
the scanner tests that need Markdown sources, and `test_sdk_doc_links.py`.
