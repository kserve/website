"""Resolve built-site links as GitHub Pages serves them, and gate only new failures."""

from datetime import date, timedelta
import json
import re
import unittest

from link_fixtures import API, LYCHEE, ROOT, checkout, doc, links, run_check
from linkcheck.notifications import finding_row
from linkcheck.site import Site, fold


def page(body):
    return f'<!doctype html><html><body><div class="theme-doc-markdown markdown">{body}</div></body></html>'


def anchors(*hrefs):
    return page("".join(f'<a href="{href}">link</a>' for href in hrefs))


def scan(root):
    return Site(root / "build", root, links.Checker(str(LYCHEE), root)).scan()


def failures(facts):
    return {item["url"]: item["detail"] for item in facts["local"]}


class ResolverTests(unittest.TestCase):
    def test_paths_resolve_like_github_pages(self):
        resolved = [
            "/website/foo",
            "/website/foo.html",
            "/website/foo/child",
            "/website/idx",
            "/website/idx/",
            "/website/a%20b",
            "/website/foo?tab=1#",
            "/website/",
            "/website",
            "/website/img/logo.png",
            "/website/dir/only",
        ]
        broken = [
            "/website/foo/",  # foo.html is not served with a trailing slash
            "/website/dir",  # a bare directory has nothing to serve
            "/website/dir/",
            "/website/nope",
            "/website/img/missing.png",
        ]
        pages = {
            "index.html": page(""),
            "foo.html": page(""),
            "foo/child.html": page(""),
            "idx/index.html": page(""),
            "a b.html": page(""),
            "dir/only.html": page(""),
            "img/logo.png": "png",
            "x.html": anchors(*resolved, *broken),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            set(failures(facts)),
            {
                "site:/foo/",
                "site:/dir",
                "site:/dir/",
                "site:/nope",
                "site:/img/missing.png",
            },
        )
        self.assertEqual(facts["external"], {})

    def test_relative_links_resolve_from_the_served_url(self):
        pages = {
            "target.html": page(""),
            "flat.html": anchors("target", "./target"),
            "nested/index.html": anchors("target", "../target"),
            # Served as /website/c%23: the name is a path, not a fragment.
            "c#.html": page('<h2 id="here"></h2><a href="#here"></a>'),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            {(item["page"], item["url"]) for item in facts["local"]},
            {("/nested/", "site:/nested/target")},
        )

    def test_dots_and_backslashes_resolve_as_in_a_browser(self):
        pages = {
            "docs/next/foo.html": page('<h2 id="a\\b"></h2>'),
            "docs/next.html": page(""),
            "docs/next/a/b.html": anchors(
                # Excess ".." segments stop at the host root.
                "../../../../../website/docs/next/foo",
                "../../../../../../../website/docs/next/gone",
                "..\\foo",
                "https:\\\\kserve.github.io\\website\\docs\\next\\foo",
                "https:/website/docs/next/foo",
                "https://kserve.github.io/website/docs/next/x/../foo",
                "/website/docs/next/x/%2e%2E/foo",
                # A trailing dot segment leaves a slash, so docs/next.html is not served.
                "https://kserve.github.io/website/docs/next/a/..",
                # Only backslashes before the query are slashes.
                "/website/docs/next/foo#a\\b",
            ),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            set(failures(facts)), {"site:/docs/next/gone", "site:/docs/next/"}
        )
        self.assertEqual(facts["external"], {})

    def test_links_outside_the_base_path_are_checked_online(self):
        # Sibling sites such as /archive/0.15/ share the host, not the build.
        hrefs = (
            "/docs/intro",
            "/archive/0.15/",
            "../archive/0.15/",
            "https://kserve.github.io/archive/0.15/",
        )

        def http(name, inputs):
            return {
                "error_map": {
                    "stdin": [
                        {"url": url, "status": {"code": 404, "text": "Not Found"}}
                        for url in inputs
                        if url.endswith("/docs/intro")
                    ]
                },
                "success_map": {
                    "stdin": [
                        {"url": url, "status": {"code": 200, "text": "OK"}}
                        for url in inputs
                        if not url.endswith("/docs/intro")
                    ]
                },
            }

        with (
            checkout({"x.html": page("")}) as base,
            checkout({"x.html": anchors(*hrefs)}) as head,
        ):
            self.assertEqual(scan(head)["local"], [])
            code, report, calls = run_check(head, base, API(), http=http)
        self.assertEqual(code, 1)
        self.assertEqual(
            calls[0],
            (
                "external",
                [
                    "https://kserve.github.io/archive/0.15/",
                    "https://kserve.github.io/docs/intro",
                ],
            ),
        )
        self.assertEqual(
            {item["url"]: item["status"] for item in report["observations"]},
            {
                "https://kserve.github.io/archive/0.15/": "ok",
                "https://kserve.github.io/docs/intro": "missing",
            },
        )

    def test_trailing_slash_setting_is_required(self):
        for value in (True, None):
            with (
                self.subTest(trailingSlash=value),
                checkout({"x.html": page("")}, config={"trailingSlash": value}) as root,
                self.assertRaisesRegex(ValueError, "trailingSlash"),
            ):
                scan(root)

    def test_base_path_comes_from_the_site_configuration(self):
        pages = {
            "x.html": anchors(
                "/docs-site/missing", "https://kserve.github.io/docs-site/gone"
            )
        }
        with checkout(pages, config={"baseUrl": "/docs-site/"}) as root:
            facts = scan(root)
        self.assertEqual(set(failures(facts)), {"site:/missing", "site:/gone"})


class AnchorTests(unittest.TestCase):
    def test_ids_and_named_anchors(self):
        target = page(
            '<meta name="description" content="x"><h2 id="sec">S</h2>'
            '<a name="legacy"></a><span id="über"></span>'
        )
        pages = {
            "t.html": target,
            "x.html": anchors(
                "/website/t#sec",
                "/website/t#legacy",
                "/website/t#%C3%BCber",
                "/website/t#description",
                "/website/t#nope",
                "/website/t#top",
                "/website/t#Top",
                # Browsers strip the text directive before the anchor lookup.
                "/website/t#sec:~:text=S",
                "/website/t#:~:text=S",
                "/website/t#lost:~:text=S",
            ),
            "self.html": page(
                '<h2 id="here"></h2><a href="#here"></a><a href="#gone"></a>'
                '<a href="#top"></a><a href="#TOP"></a><a href="#"></a>'
            ),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            set(failures(facts)),
            {"site:/t#description", "site:/t#nope", "site:/t#lost", "site:/self#gone"},
        )

    def test_redirect_stubs_keep_the_fragment(self):
        stub = (
            '<html><head><meta http-equiv="refresh" content="0; url={}"></head></html>'
        )
        pages = {
            "new.html": page('<h2 id="sec"></h2>'),
            "old/index.html": stub.format("/website/new"),
            "older/index.html": stub.format("../old"),
            "dotted/index.html": stub.format("../../../website/new"),
            "slashed/index.html": stub.format("..\\new"),
            "x.html": anchors(
                "/website/old#sec",
                "/website/older#sec",
                "/website/old#gone",
                "/website/dotted#sec",
                "/website/slashed#sec",
            ),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(set(failures(facts)), {"site:/old#gone"})

    def test_anchors_behind_redirects_off_the_site_are_unverifiable(self):
        stub = (
            '<html><head><meta http-equiv="refresh" content="0; url={}"></head></html>'
        )
        pages = {
            "sibling/index.html": stub.format("/archive/0.15/"),
            "away/index.html": stub.format("https://example.com/docs"),
            "x.html": anchors(
                "/website/sibling#sec", "/website/away#sec", "/website/away"
            ),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            {item["url"]: (item["status"], item["detail"]) for item in facts["local"]},
            {
                url: (
                    "unknown",
                    "Redirect leaves the site, so the anchor is unverifiable",
                )
                for url in ("site:/sibling#sec", "site:/away#sec")
            },
        )

    def test_non_html_targets_accept_fragments(self):
        pages = {
            "files/spec.yaml": "a: 1\n",
            "x.html": anchors("/website/files/spec.yaml#L1"),
        }
        with checkout(pages) as root:
            self.assertEqual(scan(root)["local"], [])

    def test_scripts_and_contact_links_are_not_links(self):
        pages = {
            "x.html": anchors(
                "javascript:void(0)", "mailto:a@b.c", "tel:+1", "data:text/plain,x"
            )
            + '<img src="data:image/png;base64,AAAA">'
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual((facts["local"], facts["external"]), ([], {}))

    def test_unusable_hrefs_fail_on_their_page(self):
        # The href goes into the fragment of the page URL, so each one is its
        # own row and exception, and the target still opens the page.
        pages = {
            "x.html": anchors(
                "ghttps://github.com/kserve/website",
                "ghttps://github.com/kserve/kserve",
                "http://[::1/docs",
                "https://host.invalid:99999/doc",
                "https://host.invalid:abc/doc",
            )
        }
        with checkout(pages) as head:
            facts = scan(head)
            _, report, _ = run_check(head, offline=True)
        self.assertEqual(
            failures(facts),
            {
                "site:/x#ghttps://github.com/kserve/website": "Unsupported URL scheme ghttps:",
                "site:/x#ghttps://github.com/kserve/kserve": "Unsupported URL scheme ghttps:",
                "site:/x#http://[::1/docs": "Malformed URL",
                "site:/x#https://host.invalid:99999/doc": "Malformed URL",
                "site:/x#https://host.invalid:abc/doc": "Malformed URL",
            },
        )
        self.assertEqual(facts["external"], {})
        self.assertEqual(len(report["observations"]), 5)


class TargetEncodingTests(unittest.TestCase):
    def test_control_characters_stay_encoded_in_targets(self):
        # Decoded control characters would make the gate reject its own report.
        pages = {
            "t.html": page(""),
            "x.html": anchors(
                "/website/docs/x%0A",
                "/website/t#a%09b",
                "/website/y%00",
                "/website/z%7F",
                "https://github.com/kserve/website/blob/main/docs/x%0A.md",
                "https://example.com/a\x01b",
            ),
        }
        expected = {
            "site:/docs/x%0A",
            "site:/t#a%09b",
            "site:/y%00",
            "site:/z%7F",
            "repo:/docs/x%0A.md",
        }
        with checkout(pages) as base, checkout(pages) as head:
            facts = scan(head)
            code, report, _ = run_check(head, base, offline=True)
        self.assertEqual(set(failures(facts)), expected)
        self.assertEqual(set(facts["external"]), {"https://example.com/a%01b"})
        self.assertEqual(code, 0)
        self.assertEqual({item["url"] for item in report["observations"]}, expected)

    def test_names_longer_than_the_file_system_allows_are_missing(self):
        name = "a" * 300
        pages = {
            "x.html": anchors(
                f"/website/{name}",
                f"https://github.com/kserve/website/blob/main/{name}.md",
            )
        }
        with checkout(pages) as root:
            facts = scan(root)
        # Python 3.12 raises ENAMETOOLONG here, 3.14 reports the file as absent;
        # either way the link is a finding, not a crash.
        self.assertEqual(
            {item["url"]: item["status"] for item in facts["local"]},
            {f"site:/{name}": "missing", f"repo:/{name}.md": "missing"},
        )

    def test_urls_too_long_to_observe_fail_on_their_page(self):
        external = "https://example.com/" + "a" * 16400
        internal = "/website/" + "b/" * 8200
        with checkout({"x.html": anchors(external, internal)}) as head:
            facts = scan(head)
            code, report, calls = run_check(head, advisory=True)
        self.assertEqual(facts["external"], {})
        self.assertEqual(
            sorted((len(item["url"]), item["detail"]) for item in facts["local"]),
            [(16384, "URL is longer than 16384 characters")] * 2,
        )
        self.assertTrue(
            all(item["url"].startswith("site:/x#") for item in facts["local"])
        )
        self.assertEqual([url for _, inputs in calls for url in inputs], [])
        self.assertEqual((code, len(report["observations"])), (0, 2))


class RegionTests(unittest.TestCase):
    def test_theme_navigation_is_skipped_on_content_pages(self):
        with checkout({"x.html": doc('<a href="/website/missing">x</a>')}) as root:
            facts = scan(root)
        self.assertEqual(set(failures(facts)), {"site:/missing"})

    def test_blog_posts_and_the_homepage_are_content(self):
        pages = {
            "blog/post.html": '<html><body><main><div id="__blog-post-container" class="markdown">'
            '<a href="/website/blog-missing"></a></div><a href="/website/blog-footer"></a></main></body></html>',
            "index.html": '<html><body><main><a href="/website/home-missing"></a></main></body></html>',
            "other.html": '<html><body><main><a href="/website/main-missing"></a></main></body></html>',
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            set(failures(facts)), {"site:/blog-missing", "site:/home-missing"}
        )

    def test_theme_chrome_is_checked_once_from_the_404_page(self):
        chrome = (
            '<html><body><div class="theme-announcement-bar"><a href="https://cncf.example.org/">x</a></div>'
            '<nav class="theme-layout-navbar"><a href="/website/nav-missing">x</a></nav>'
            '<main><a href="/website/content-404"></a></main>'
            '<footer class="theme-layout-footer"><a href="https://slack.invalid/">x</a></footer></body></html>'
        )
        config = "export default {\n  navbar: {\n    to: '/nav-missing',\n  },\n};\n"
        with checkout(
            {"404.html": chrome}, files={"docusaurus.config.ts": config}
        ) as root:
            facts = scan(root)
        self.assertEqual(
            facts["local"],
            [
                {
                    "url": "site:/nav-missing",
                    "page": "/404",
                    "key": ["chrome", "/nav-missing"],
                    "status": "missing",
                    "detail": "No page at this path on GitHub Pages",
                    "source": {"path": "docusaurus.config.ts", "line": 3},
                }
            ],
        )
        self.assertEqual(
            set(facts["external"]),
            {"https://cncf.example.org/", "https://slack.invalid/"},
        )

    def test_unclosed_and_minified_markup_keeps_region_boundaries(self):
        body = (
            '<div class="theme-doc-markdown"><div><p><a href="/website/in-1">x'
            '<ul><li><a href="/website/in-2"><img src="/website/in-3.png"></ul></div>'
            '<svg><use href="#icon"/></svg><a href="/website/in-4"></div>'
            '<a href="/website/outside"></a>'
        )
        with checkout({"x.html": f"<html><body>{body}</body></html>"}) as root:
            facts = scan(root)
        self.assertEqual(
            set(failures(facts)),
            {"site:/in-1", "site:/in-2", "site:/in-3.png", "site:/in-4"},
        )

    def test_navigation_nested_in_content_is_skipped(self):
        body = (
            '<div class="theme-doc-toc-mobile"><a href="#generated"></a></div>'
            '<a href="/website/kept"></a>'
        )
        with checkout({"x.html": page(body)}) as root:
            self.assertEqual(set(failures(scan(root))), {"site:/kept"})


class LinkKindTests(unittest.TestCase):
    def test_self_links_are_checked_in_the_build(self):
        pages = {
            "foo.html": page(""),
            "x.html": anchors(
                "https://kserve.github.io/website/master/x",
                "https://kserve.github.io/website/foo",
                "HTTP://KSERVE.GITHUB.IO/website",
                "https://kserve.github.io/archive/0.15/",
                "https://kserve.github.io/websites",
                "//kserve.github.io/website/gone",
                "https://kserve.github.io/website?tab=1",
                "https://kserve.github.io/website#missing",
                "https://mirror.example/website/foo",
            ),
            "index.html": page(""),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            set(failures(facts)), {"site:/master/x", "site:/gone", "site:/#missing"}
        )
        self.assertEqual(
            set(facts["external"]),
            {
                "https://kserve.github.io/archive/0.15/",
                "https://kserve.github.io/websites",
                "https://mirror.example/website/foo",
            },
        )

    def test_same_repository_github_links_use_the_checkout(self):
        pages = {
            "x.html": anchors(
                "https://github.com/kserve/website/blob/main/docs/exists.md",
                "https://github.com/kserve/website/tree/main/docs/gone",
                "https://github.com/kserve/website",
                "https://github.com/kserve/website/blob/release-0.16/x.md",
                "https://github.com/kserve/kserve/blob/master/README.md",
            )
        }
        with checkout(pages, files={"docs/exists.md": "# Exists\n"}) as root:
            facts = scan(root)
        self.assertEqual(
            failures(facts),
            {
                "repo:/docs/gone": "File not found. Check if file exists and path is correct"
            },
        )
        self.assertEqual(
            set(facts["external"]),
            {
                "https://github.com/kserve/website/blob/release-0.16/x.md",
                "https://github.com/kserve/kserve/blob/master/README.md",
            },
        )

    def test_external_inventory_shares_general_fragments_and_keeps_github_headings(
        self,
    ):
        pages = {
            "a.html": anchors(
                "https://www.python.org/doc#one",
                "https://github.com/o/r/blob/main/a.md#heading",
            ),
            "b.html": anchors("https://www.python.org/doc#two"),
        }
        with checkout(pages) as root:
            facts = scan(root)
        self.assertEqual(
            set(facts["external"]),
            {
                "https://www.python.org/doc",
                "https://github.com/o/r/blob/main/a.md#heading",
            },
        )


class SourceTests(unittest.TestCase):
    def test_edit_links_permalinks_and_lines_locate_sources(self):
        edited = doc(
            '<a href="/website/docs/next/other#missing">x</a>',
            edit="https://github.com/kserve/website/tree/main/docs/guide.md",
        )
        metadata = {
            "permalink": "/website/docs/next/listed",
            "source": "@site/docs/listed.mdx",
        }
        files = {
            "docs/guide.md": "# Guide\n\nSee [other](./other.md#missing).\n",
            "docs/listed.mdx": '# Listed\n\n<a href="/website/gone">raw</a>\n',
            ".docusaurus/docusaurus-plugin-content-docs/default/site-docs-listed-mdx-abc.json": json.dumps(
                metadata
            ),
        }
        pages = {
            "docs/next/other.html": page(""),
            "docs/next/guide.html": edited,
            "docs/next/listed.html": anchors("/website/gone"),
            "docs/next/unknown.html": anchors("/website/unknown-target"),
        }
        with checkout(pages, files=files) as root:
            facts = scan(root)
        self.assertEqual(
            {item["url"]: item["source"] for item in facts["local"]},
            {
                "site:/docs/next/other#missing": {"path": "docs/guide.md", "line": 3},
                "site:/gone": {"path": "docs/listed.mdx", "line": 3},
                "site:/unknown-target": {"path": "docusaurus.config.ts"},
            },
        )

    def test_homepage_links_are_found_in_section_components(self):
        files = {
            "src/pages/index.tsx": "export default function Home() {}\n",
            "src/components/Benefits/index.tsx": "const items = [\n  {to: '/docs/missing'},\n];\n",
        }
        pages = {
            "index.html": '<html><body><main><a href="/website/docs/missing">x</a></main></body></html>'
        }
        with checkout(pages, files=files) as root:
            facts = scan(root)
        self.assertEqual(
            facts["local"][0]["source"],
            {"path": "src/components/Benefits/index.tsx", "line": 2},
        )


class KeyTests(unittest.TestCase):
    def test_documentation_versions_share_a_key(self):
        for route in ("/docs/next/a", "/docs/0.16/a", "/docs/a", "/docs/1.2.3/a"):
            self.assertEqual(fold(route), "/docs/{v}/a")
        self.assertEqual(fold("/docs"), "/docs/{v}")
        self.assertEqual(fold("/docsearch/a"), "/docsearch/a")
        self.assertEqual(fold("/blog/docs/next"), "/blog/docs/next")

    def test_a_version_cut_adds_no_gate_keys(self):
        def versions(*names):
            pages = {}
            for name in names:
                prefix = "docs/" if name == "" else f"docs/{name}/"
                link = "/website/" + prefix + "b#gone"
                pages[prefix + "a.html"] = anchors(
                    link, "/website/" + prefix + "missing"
                )
                pages[prefix + "b.html"] = page('<h2 id="kept"></h2>')
            return pages

        base = versions("next", "", "0.19")
        cut = versions("next", "", "0.20", "0.19")
        regression = {**cut, "docs/next/a.html": anchors("/website/docs/next/b#other")}
        for head, expected in ((cut, 0), (regression, 1)):
            with (
                self.subTest(expected=expected),
                checkout(base) as base_root,
                checkout(head) as head_root,
            ):
                code, report, _ = run_check(head_root, base_root, offline=True)
                self.assertEqual(code, expected)
                self.assertEqual(report["scope"], "pr")


class GateTests(unittest.TestCase):
    def test_existing_debt_passes_and_only_new_destinations_are_requested(self):
        debt = (
            "/website/missing",
            "https://www.python.org/old",
            "https://github.com/o/r/blob/main/old.md",
        )
        for addition, expected in (
            ((), 0),
            (("https://github.com/o/r/blob/main/new.md",), 1),
            (("/website/new-missing",), 1),
            (("https://www.python.org/new",), 1),
        ):

            def http(name, inputs):
                return {
                    "error_map": {
                        "stdin": [
                            {"url": url, "status": {"code": 404, "text": "Not Found"}}
                            for url in inputs
                        ]
                    }
                }

            with (
                self.subTest(addition=addition),
                checkout({"x.html": anchors(*debt)}) as base,
                checkout({"x.html": anchors(*debt, *addition)}) as head,
            ):
                api = API(refs=["main"], content=(404, {}))
                code, report, calls = run_check(head, base, api, http=http)
                self.assertEqual(code, expected)
                self.assertFalse(any("/contents/old.md" in path for path in api.calls))
                requested = {url for _, inputs in calls for url in inputs}
                self.assertNotIn("https://www.python.org/old", requested)
                if "github.com" in "".join(addition):
                    self.assertTrue(any("/contents/new.md" in p for p in api.calls))
                else:
                    self.assertEqual(api.calls, [])
                if "https://www.python.org/new" in addition:
                    self.assertEqual(
                        calls,
                        [
                            ("external", ["https://www.python.org/new"]),
                            ("external-recheck", ["https://www.python.org/new"]),
                        ],
                    )

    def test_deleting_a_target_fails_on_unchanged_pages(self):
        pages = {
            "a.html": anchors("/website/missing", "/website/b#section"),
            "b.html": page('<h2 id="section"></h2>'),
        }
        with checkout(pages) as base, checkout(pages) as head:
            self.assertEqual(run_check(head, base, offline=True)[0], 0)
            (head / "build/b.html").unlink()
            code, report, _ = run_check(head, base, offline=True)
            self.assertEqual(code, 1)
            self.assertEqual(
                {item["url"] for item in report["observations"]},
                {"site:/missing", "site:/b#section"},
            )

    def test_advisory_audit_reports_debt_without_failing(self):
        with checkout({"x.html": anchors("/website/missing")}) as head:
            code, report, _ = run_check(head, advisory=True)
        self.assertEqual(code, 0)
        self.assertEqual((report["scope"], report["complete"]), ("audit", True))
        self.assertEqual(report["observations"][0]["status"], "missing")

    def test_offline_gate_requests_nothing_and_is_incomplete(self):
        with checkout({"x.html": anchors("https://www.python.org/")}) as head:
            api = API()
            code, report, calls = run_check(head, api=api, offline=True)
        self.assertEqual(
            (code, report["complete"], calls, api.calls), (0, False, [], [])
        )

    def test_exceptions_suppress_local_failures(self):
        expires = (date.today() + timedelta(days=30)).isoformat()
        exceptions = {
            "version": 1,
            "exceptions": [
                {
                    "url": "site:/missing",
                    "reason": "Tracked upstream",
                    "expires": expires,
                }
            ],
        }
        with checkout(
            {"x.html": anchors("/website/missing")},
            files={".github/link-check-exceptions.json": json.dumps(exceptions)},
        ) as head:
            code, report, _ = run_check(head, offline=True)
        self.assertEqual(code, 0)
        self.assertEqual(report["observations"][0]["status"], "suppressed")

    def test_one_exception_covers_every_docs_version(self):
        expires = (date.today() + timedelta(days=30)).isoformat()
        exceptions = {
            "version": 1,
            "exceptions": [
                {
                    "url": "site:/docs/{v}/spec#gone",
                    "reason": "Tracked upstream",
                    "expires": expires,
                }
            ],
        }
        pages = {
            "docs/spec.html": page(""),
            "docs/0.19/spec.html": page(""),
            "docs/next/spec.html": page(""),
            "x.html": anchors(
                "/website/docs/spec#gone",
                "/website/docs/0.19/spec#gone",
                "/website/docs/next/spec#gone",
                "/website/docs/next/spec#other",
            ),
        }
        with checkout(
            pages, files={".github/link-check-exceptions.json": json.dumps(exceptions)}
        ) as head:
            code, report, _ = run_check(head, offline=True)
            summary = (head / "report/summary.md").read_text()
        self.assertEqual(code, 1)
        self.assertEqual(
            {item["url"]: item["status"] for item in report["observations"]},
            {
                "site:/docs/spec#gone": "suppressed",
                "site:/docs/0.19/spec#gone": "suppressed",
                "site:/docs/next/spec#gone": "suppressed",
                "site:/docs/next/spec#other": "missing",
            },
        )
        self.assertNotIn("Unused exceptions", summary)

    def test_unverifiable_local_targets_warn_without_failing(self):
        # A directory heading is unverifiable without a README to read.
        link = "https://github.com/kserve/website/tree/main/docs/dir#heading"
        with (
            checkout({"x.html": page("")}) as base,
            checkout(
                {"x.html": anchors(link)}, files={"docs/dir/notes.txt": "x\n"}
            ) as head,
        ):
            facts = scan(head)
            code, report, _ = run_check(head, base, offline=True)
            summary = (head / "report/summary.md").read_text()
        self.assertEqual(
            [(item["url"], item["status"]) for item in facts["local"]],
            [("repo:/docs/dir#heading", "unknown")],
        )
        self.assertEqual(code, 0)
        self.assertEqual(report["observations"][0]["status"], "unknown")
        self.assertIn("Local failures: 0 reported", summary)
        self.assertIn("Inconclusive targets: 1.", summary)

    def test_an_unverifiable_base_target_does_not_hide_a_missing_one(self):
        link = "https://github.com/kserve/website/tree/main/docs/dir#heading"
        pages = {"x.html": anchors(link)}
        with (
            checkout(pages, files={"docs/dir/notes.txt": "x\n"}) as base,
            checkout(pages) as head,
        ):
            code, report, _ = run_check(head, base, offline=True)
        self.assertEqual(code, 1)
        self.assertEqual(
            [(item["url"], item["status"]) for item in report["observations"]],
            [("repo:/docs/dir#heading", "missing")],
        )

    def test_over_dotted_links_keep_distinct_targets(self):
        # Both clamp at the host root; collapsing them would hide the new one.
        old, new = "../../../../../../../intro", "../../../../../../../setup"

        def http(name, inputs):
            return {
                "error_map": {
                    "stdin": [
                        {"url": url, "status": {"code": 404, "text": "Not Found"}}
                        for url in inputs
                    ]
                }
            }

        with (
            checkout({"docs/next/a/b.html": anchors(old)}) as base,
            checkout({"docs/next/a/b.html": anchors(old, new)}) as head,
        ):
            code, report, calls = run_check(head, base, API(), http=http)
        self.assertEqual(code, 1)
        self.assertEqual(calls[0], ("external", ["https://kserve.github.io/setup"]))
        self.assertEqual(
            [(item["url"], item["status"]) for item in report["observations"]],
            [("https://kserve.github.io/setup", "missing")],
        )

    def test_long_or_multiline_details_fit_the_report(self):
        # The report rejects details over 2000 characters or with control
        # characters, and Lychee errors embed the URL they failed on.
        def http(name, inputs):
            return {
                "error_map": {
                    "stdin": [
                        {
                            "url": url,
                            "status": {
                                "code": 503,
                                "text": f"Network error: {url}{'x' * 2000}\ncaused by: reset",
                            },
                        }
                        for url in inputs
                    ]
                }
            }

        hrefs = ("https://www.python.org/down", "s" * 2100 + ":x")
        with checkout({"x.html": anchors(*hrefs)}) as head:
            code, report, _ = run_check(head, advisory=True, http=http)
        self.assertEqual(code, 0)
        details = [item["detail"] for item in report["observations"]]
        self.assertEqual(len(details), 2)
        for detail in details:
            self.assertLessEqual(len(detail), 2000)
            self.assertNotRegex(detail, r"[\x00-\x1f\x7f]")

    def test_targets_excluded_by_lychee_are_not_observed(self):
        def http(name, inputs):
            return {
                "excluded_map": {
                    "stdin": [
                        {"url": u, "status": {"text": "Excluded"}} for u in inputs
                    ]
                }
            }

        with checkout({"x.html": anchors("https://example.com/x")}) as head:
            code, report, _ = run_check(head, advisory=True, http=http)
        self.assertEqual(report["observations"], [])

    def test_only_404_and_410_are_rechecked(self):
        urls = ["https://www.python.org/down", "https://www.python.org/missing"]

        def http(name, inputs):
            return {
                "error_map": {
                    "stdin": [
                        {
                            "url": url,
                            "status": {
                                "code": 503 if url.endswith("down") else 404,
                                "text": "failed",
                            },
                        }
                        for url in inputs
                    ]
                }
            }

        with (
            checkout({"x.html": page("")}) as base,
            checkout({"x.html": anchors(*urls)}) as head,
        ):
            code, report, calls = run_check(head, base, API(), http=http)
        self.assertEqual(code, 1)
        self.assertEqual(calls[-1], ("external-recheck", [urls[1]]))
        self.assertEqual(
            {i["url"]: i["status"] for i in report["observations"]},
            {urls[0]: "unreachable", urls[1]: "missing"},
        )

    def test_inaccessible_github_issue_link_is_inconclusive(self):
        url = "https://github.com/o/private/issues/1"

        def http(name, inputs):
            return {
                "error_map": {
                    "stdin": [{"url": url, "status": {"code": 404, "text": "x"}}]
                }
            }

        with (
            checkout({"x.html": page("")}) as base,
            checkout({"x.html": anchors(url)}) as head,
        ):
            code, report, _ = run_check(head, base, API(repository=404), http=http)
        self.assertEqual(code, 0)
        self.assertEqual(report["observations"][0]["status"], "restricted")


class IssueTests(unittest.TestCase):
    def test_site_targets_link_the_live_page_and_the_source(self):
        record = {
            "url": "site:/docs/next/a#über",
            "kind": "local",
            "status": "missing",
            "detail": "Anchor is missing from the target page",
            "sources": [{"path": "docs/guide.md", "line": 4}],
        }
        row = finding_row(record, "kserve/website", "abc")
        self.assertIn(
            "[/website/docs/next/a#\u200büber](https://kserve.github.io/website/docs/next/a#%C3%BCber)",
            row,
        )
        self.assertIn(
            "[docs/guide.md:4](https://github.com/kserve/website/blob/abc/docs/guide.md#L4)",
            row,
        )


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        text = (ROOT / ".github/workflows/check-links.yml").read_text()
        self.workflow = text
        jobs = text.split("\njobs:\n", 1)[1]
        self.jobs = dict(
            re.findall(r"(?m)^  ([\w-]+):\n((?:(?:    .*)?\n)+)", jobs + "\n")
        )

    def test_jobs_and_pinned_actions(self):
        self.assertEqual(set(self.jobs), {"build", "check-links", "triage"})
        uses = re.findall(r"uses: (\S+)(.*)", self.workflow)
        self.assertTrue(uses)
        for action, comment in uses:
            with self.subTest(action=action):
                self.assertRegex(action, r"^[\w-]+/[\w-]+@[0-9a-f]{40}$")
                self.assertRegex(comment, r"^ # v\d+\.\d+\.\d+$")
        self.assertEqual(
            self.workflow.count("persist-credentials: false"),
            self.workflow.count("uses: actions/checkout@"),
        )

    def test_only_the_trusted_publisher_can_write(self):
        for name, body in self.jobs.items():
            with self.subTest(job=name):
                if name == "triage":
                    self.assertIn("issues: write", body)
                    self.assertIn("actions: read", body)
                    self.assertIn("github.repository == 'kserve/website'", body)
                else:
                    self.assertNotIn("issues:", body)
                    self.assertNotIn("actions: read", body)
                    self.assertNotIn("permissions:", body)
        self.assertNotIn("github.token", self.jobs["build"])
        self.assertNotIn("secrets.", self.workflow)

    def steps(self, job):
        return {
            step.split("\n", 1)[0]: step
            for step in self.jobs[job].split("\n      - name: ")[1:]
        }

    def test_facts_are_downloaded_by_name_into_fixed_paths(self):
        # With pattern:, one matching artifact is extracted into path itself,
        # so schedule runs, which build only the head, lost the side directory.
        self.assertNotRegex(self.workflow, r"(?m)^\s+pattern:")
        steps = self.steps("check-links")
        gate = steps["Check for regressions or audit existing links"]
        for side in ("head", "base"):
            with self.subTest(side=side):
                step = steps[f"Download {side} link facts"]
                self.assertIn(f"name: link-facts-{side}\n", step)
                self.assertIn(f"path: facts/link-facts-{side}\n", step)
                self.assertIn(f"../facts/link-facts-{side}/facts.json", gate)
        # Audits build only the head.
        self.assertNotIn("if:", steps["Download head link facts"])
        self.assertIn(
            "if: github.event_name == 'pull_request' || github.event_name == 'merge_group'\n",
            steps["Download base link facts"],
        )

    def test_a_dispatch_cannot_cancel_a_pending_nightly(self):
        # A concurrency group keeps only its newest pending run by default.
        self.assertIn(
            "group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}",
            self.workflow.split("\njobs:\n", 1)[0],
        )
        triage = self.jobs["triage"]
        self.assertIn("group: ${{ github.workflow }}-triage\n      queue: max", triage)
        self.assertNotIn("cancel-in-progress", triage)

    def test_the_pr_build_cannot_write_a_cache_the_deployment_restores(self):
        build = self.jobs["build"]
        self.assertIn("cache-mode: read", build)
        self.assertIn(
            "cache: ${{ (github.event_name == 'pull_request' || github.event_name == 'merge_group') && 'npm' || '' }}",
            build,
        )
        self.assertIn("NODE_ENV=production npx docusaurus build", build)
        self.assertIn("node-version: 22.14.x", build)


@unittest.skipUnless(LYCHEE.is_file(), "Install Lychee with make lychee")
class RepositoryAnchorTests(unittest.TestCase):
    def test_same_repository_headings_are_checked_in_the_checkout(self):
        pages = {
            "x.html": anchors(
                "https://github.com/kserve/website/blob/main/docs/guide.md#existing-heading",
                "https://github.com/kserve/website/blob/main/docs/guide.md#missing-heading",
            )
        }
        with checkout(pages, files={"docs/guide.md": "# Existing heading\n"}) as root:
            facts = scan(root)
        self.assertEqual(set(failures(facts)), {"repo:/docs/guide.md#missing-heading"})


if __name__ == "__main__":
    unittest.main()
