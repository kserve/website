# Documentation link checks

Docusaurus checks Markdown links and `<Link>` targets while it builds, but not
raw `<a href>` tags, anchors (`onBrokenAnchors` only warns), or external URLs.
These checks cover the rest by reading the production build, the same HTML that
GitHub Pages serves, so routes are already resolved and raw HTML, component
links and MDX-generated URLs are visible. Source Markdown is not checked.

```bash
npm ci
make build-site                               # NODE_ENV=production docusaurus build into build/
make check-links LINK_CHECK_ARGS=--offline    # links inside the build only
GITHUB_TOKEN=$(gh auth token) make check-links LINK_CHECK_ARGS=--advisory
make test-links                               # unit tests; no Node, no requests beyond `make lychee`
```

`make check-links` runs two steps of `hack/check-links.py`:

- `scan --site <build> --output facts.json` reads one build offline and records
  local failures and the external URL inventory, with source locations.
- `gate --facts facts.json [--base-facts base.json]` applies exceptions,
  requests external URLs, verifies GitHub targets, and writes
  `bin/link-check/observations.json` and `summary.md`. `--offline` skips all
  requests, `--advisory` reports without failing. Set `SITE_DIR` to scan
  another build directory.

Python 3.10 or newer, standard library only. External URLs are checked with the
pinned Lychee release from `make lychee`.

## What is scanned

Only rendered content is inventoried, from `a[href]` and `img[src]`:

- doc pages: `.theme-doc-markdown`;
- blog posts: `#__blog-post-container`;
- the homepage: `<main>`.

Theme chrome (announcement bar, navbar, footer) repeats on every page, so it is
read once from `404.html` and attributed to `docusaurus.config.ts`. The table of
contents, sidebar, breadcrumbs, pagination and edit footer are generated from
checked content and skipped. So are `<head>`, `#`, `javascript:`, `mailto:`,
`tel:` and `data:` links. Any other scheme, such as a `ghttps://` typo, fails on
the page that carries it, and so does a malformed URL or one longer than 16384
characters. Pages are parsed with an element stack (`html.parser`), so minified
markup is fine.

## Resolving links like GitHub Pages

`baseUrl`, `url` and `trailingSlash` come from `.docusaurus/docusaurus.config.mjs`,
which the build writes. The resolver requires `trailingSlash: false`. After the
query and fragment are removed and the path is decoded and stripped of the base
path:

| Path | Resolves when |
|---|---|
| empty or ending in `/` | `<path>/index.html` is a file |
| anything else | `<path>`, `<path>.html` or `<path>/index.html` is a file |

A bare directory does not resolve, and neither does `foo/` when only `foo.html`
exists. These are the route-flattening mistakes that reached the live site in
#695 and #776. Lychee's offline mode tests directories before extensions and
drops trailing slashes, so it cannot express these rules.

Hrefs resolve from the absolute served URL, as in a browser: `x.html` is
served as `/x`, and `x/index.html` as `/x/`. Excess `..` segments stop at the
host root, and backslashes before the query count as slashes. Anchors are `id`
attributes and `<a name>` on the target page. `#top` works in any case, and a
`:~:` text directive is ignored. Redirect stubs from `plugin-client-redirects`
keep the fragment, so their `meta refresh` target is followed. A stub that
leaves the base path makes the anchor inconclusive. Fragments on non-HTML files
are not checked.

Links to `https://kserve.github.io/website/...`, `.../website?...` and
`.../website#...` are checked in the build like relative links. Anything that
resolves outside the base path is requested online, whether it is written as a
full URL or root-relative: `/archive/0.15/` is a sibling site that GitHub Pages
serves, and `/docs/intro` without `/website` is a 404 like any other missing
website.

Links to `github.com/kserve/website/{blob,tree}/main/...` are checked against the
checkout, including Markdown headings, and reported as `repo:/<path>`.

## Keys

Nightly observations name the live target: `site:/<route>[#fragment]` below the
base path, for example `site:/docs/next/intro#why-kserve`. Control characters
stay percent-encoded. An href that names no target, such as a `ghttps://` typo,
is reported as its page with the href as the fragment, for example
`site:/docs/next/intro#ghttps://github.com/kserve/website`. The URL still opens
the page, and each bad href stays its own row and exception.

The PR gate compares (page, target) pairs between the base and head builds.
Both sides fold `/docs/next/`, `/docs/0.NN/` and the unversioned `/docs/` into
`/docs/{v}/`, so cutting a version, or editing a page that already has broken
links, adds no new failures. The trade-off: a new failure that matches an
existing one in another version of the same page is treated as existing debt.

Each source location is best effort, for display. The page's "Edit this page"
link comes first, then the docs and blog permalink metadata in `.docusaurus/`,
then `docusaurus.config.ts`. The line is the first one that contains the href as
written, the href without the base path, `<name>.md#<fragment>`, or
`#<fragment>`. Homepage links are also looked up in `src/components`.

## Verification and escalation

| Target or outcome | PR check | Nightly triage |
|---|---|---|
| Missing local page or anchor | Fail for new failures | Report immediately |
| Verified missing public GitHub file, revision, or heading | Fail for new URLs | Report immediately |
| Other website returning 404/410 twice | Fail for new URLs | Escalate after seven days and at least five observations in the seven-day interval (including both endpoint dates) |
| Connection failures and HTTP 5xx | Warn | Escalate persistent failures as unreachable, using the same seven-day threshold |
| HTTP 401/403/429 or inaccessible GitHub repository | Inconclusive warning | Never declare broken automatically |

PR and merge queue runs build the base and the head in parallel and scan both
with the head scanner, so a scanner change applies to the baseline too. Local
failures are compared by key. The whole site is scanned, so deleting a target
exposes broken links on unchanged pages. Only external URLs missing from the
base build are requested. URLs that `lychee.toml` excludes, such as reserved
example domains, are not reported.

GitHub verification works across organizations. The API must establish public
repository access and resolve the revision before a missing file is conclusive.
Branch and tag names containing slashes are supported. GitHub branch-rename
redirects are followed for unqualified file pages and short-form
raw.githubusercontent.com URLs. Explicit `refs/heads/` URLs and the github.com
`/raw/` form keep their original revision. Headings are checked in the requested
document with Lychee; source line anchors are checked too. Dynamic MDX headings,
unsupported formats, large files without API content, and private repositories
remain inconclusive. General website fragments are not checked because many need
JavaScript. An exhausted GitHub API outage or rate limit pauses the remaining API
requests and records inconclusive outcomes.

## Nightly history and issue lifecycle

The scheduled run audits the head build with `--advisory`. A separate
default-branch job with `issues: write` keeps one aggregate bot issue; build and
scanner jobs cannot write to issues, and no job saves a cache. PR builds may
restore the npm cache that the Pages deployment saves, but scheduled audits use
none, so nothing they run can reach the deployment.

History, recovery and the issue are shared with kserve/kserve (see
`VENDORED.md`):

- each UTC day contributes at most one observation, and missing or incomplete
  audits are no evidence either way;
- local and verified GitHub failures are reported at once; other websites need
  seven days and five observations;
- an alert closes after two good observations on different days, including
  removed links and active exceptions; inconclusive results never confirm
  recovery;
- the registry lives in 30-day artifacts of successful default-branch runs, and
  reported targets are recovered from a compact snapshot in the issue. The
  run's commit must be on the default branch itself, since tag runs report the
  tag name as their branch, and a run that uploaded a dry-run preview is
  skipped. A recovered registry is validated like scanner data, and one
  malformed record rejects all of it;
- observation details are limited to 2,000 characters without control
  characters. The gate shortens longer Lychee errors, which embed the URL, and
  turns control characters into spaces;
- in the issue, scanner text cannot form Markdown links or images, mentions, or
  `#` references; bare URLs still autolink. Targets above the repository root
  or the site base are listed without a link;
- the bot edits only its managed section, and only when actionable findings
  change. It keeps maintainer notes and manual closure, and stops instead of
  opening a second issue if its marker is removed.

Site targets link to the live page; source locations link to the file at the
audited revision. Manual dispatch is a dry run unless `publish` is selected on
the default branch. To preview locally, run `make triage-links` after an
advisory run; it writes `issue-plan.json`, `issue-preview.md` and `state.json`
under `bin/link-check` without touching GitHub.

## Temporary exceptions

Use exact URLs in `.github/link-check-exceptions.json`. Every exception needs a
reason and an expiry no more than one year ahead:

```json
{
  "version": 1,
  "exceptions": [
    {
      "url": "site:/docs/{v}/reference/oip/post-v-2-models-model-name-versions-model-version-infer#request-input",
      "reason": "Anchor comes from the upstream Open Inference Protocol spec text",
      "expires": "2027-03-01"
    }
  ]
}
```

Use `site:/...` for built pages, `repo:/...` for same-repository files and the
full URL for anything else. An exception covers every page that links to the
target. Write `/docs/{v}/` to cover a docs page in every version, or a concrete
version to cover only that one. Expired exceptions resume checking and are listed in the report, and so
are unused ones. The history registry records observations; it is not an
allowlist.
