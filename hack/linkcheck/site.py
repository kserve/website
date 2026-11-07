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

"""Inventory links in a built Docusaurus site and resolve them as GitHub Pages does."""

import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit

from .checkout import inspect_checkout
from .policy import canonical_url


VOID = frozenset(
    "area base br col embed hr img input link meta param source track wbr".split()
)
# Theme chrome repeats on every page, so it is checked once, from 404.html.
CHROME = frozenset(
    ("theme-announcement-bar", "theme-layout-navbar", "theme-layout-footer")
)
# Generated from content that is already checked, or theme navigation.
SKIP = frozenset(
    (
        "table-of-contents",
        "theme-doc-toc-mobile",
        "theme-doc-toc-desktop",
        "theme-doc-breadcrumbs",
        "theme-doc-sidebar-container",
        "theme-doc-footer",
        "theme-blog-footer-edit-meta-row",
        "theme-edit-this-page",
        "pagination-nav",
    )
)
IGNORED_SCHEMES = ("javascript:", "mailto:", "tel:", "data:")
EDIT_URL = re.compile(
    r"^https://github\.com/[^/]+/[^/]+/(?:tree|blob|edit)/[^/]+/(.+)$"
)
# Current (next), numbered and unversioned (lastVersion) docs share one key.
DOC_VERSION = re.compile(r"^/docs(?:/(?:next|\d+(?:\.\d+)+))?(?=/|$)")
SOURCE_SUFFIXES = (".tsx", ".ts", ".jsx", ".js", ".mdx", ".md")
# Observation targets are rejected above this length (validation.py).
MAX_URL = 16384
TOO_LONG = f"URL is longer than {MAX_URL} characters"
# Decoded targets become observation URLs, which must not carry control characters.
CONTROL = re.compile(r"[\x00-\x1f\x7f]")


def fold(route):
    return DOC_VERSION.sub("/docs/{v}", route)


def printable(text):
    return CONTROL.sub(lambda match: quote(match[0]), text)


def browser_href(href):
    """Read backslashes before the query as slashes, as browsers do for http(s)."""
    path = re.match(r"[^?#]*", href)[0]
    return path.replace("\\", "/") + href[len(path) :]


def fragment_id(fragment):
    """The decoded id a fragment names; browsers strip a :~: text directive."""
    return unquote(fragment.partition(":~:")[0])


def remove_dot_segments(path):
    output = []
    for segment in path.split("/")[1:]:
        if segment == "..":
            if output:
                output.pop()
        elif segment != ".":
            output.append(segment)
    trailing = path.endswith(("/.", "/..")) and output
    return "/" + "/".join(output) + ("/" if trailing else "")


def config(root):
    """Read the resolved site configuration that Docusaurus wrote for the build."""
    path = root / ".docusaurus" / "docusaurus.config.mjs"
    _, marker, body = path.read_text().partition("export default")
    if not marker:
        raise ValueError(f"{path} has no default export")
    data = json.loads(body.strip().removesuffix(";"))
    if data.get("trailingSlash") is not False:
        raise ValueError(
            "The GitHub Pages resolver requires trailingSlash: false in docusaurus.config.ts"
        )
    base = data["baseUrl"]
    if not base.startswith("/") or not base.endswith("/"):
        raise ValueError("baseUrl must start and end with a slash")
    return data["url"].rstrip("/"), base


class Page(HTMLParser):
    """One pass over a page: links in the scanned regions, anchors and redirects.

    Regions are tracked on an element stack, so minified markup and nested
    divs need no pattern matching. End tags close any unclosed descendants.
    """

    def __init__(self, *, home=False, chrome=False):
        super().__init__(convert_charrefs=True)
        self.home = home
        self.chrome = chrome
        self.stack = []
        self.regions = self.skips = 0
        self.links = []
        self.ids = set()
        self.refresh = None
        self.edit = None

    def handle_starttag(self, tag, attrs):
        attributes = {}
        for name, value in attrs:
            attributes.setdefault(name, value or "")
        classes = set(attributes.get("class", "").split())
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "a" and "name" in attributes:
            self.ids.add(attributes["name"])
        if (
            tag == "meta"
            and attributes.get("http-equiv", "").lower() == "refresh"
            and (
                match := re.search(
                    r"url\s*=\s*['\"]?([^'\"]+)", attributes.get("content", ""), re.I
                )
            )
        ):
            self.refresh = match[1].strip()
        if tag == "a" and "theme-edit-this-page" in classes:
            self.edit = attributes.get("href")
        region = (
            "theme-doc-markdown" in classes
            or attributes.get("id") == "__blog-post-container"
            or (self.home and tag == "main")
            or (self.chrome and not classes.isdisjoint(CHROME))
        )
        skip = not classes.isdisjoint(SKIP)
        if (self.regions or region) and not (self.skips or skip):
            if tag == "a" and "href" in attributes:
                self.links.append(attributes["href"])
            elif tag == "img" and "src" in attributes:
                self.links.append(attributes["src"])
        if tag in VOID:
            return
        self.stack.append((tag, region, skip))
        self.regions += region
        self.skips += skip

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                for _, region, skip in self.stack[index:]:
                    self.regions -= region
                    self.skips -= skip
                del self.stack[index:]
                return


class Site:
    def __init__(self, out, root, checker):
        self.out = Path(out).resolve()
        self.root = Path(root).resolve()
        self.checker = checker
        self.url, self.base = config(self.root)
        self.host = urlsplit(self.url).netloc.lower()
        self.pages = {}
        self.files = {}
        self.lines = {}
        self.sources = self.permalinks()

    def permalinks(self):
        sources = {}
        for plugin in ("docs", "blog"):
            pattern = f"docusaurus-plugin-content-{plugin}/*/site-*.json"
            for path in sorted((self.root / ".docusaurus").glob(pattern)):
                data = json.loads(path.read_text())
                source = data.get("source", "")
                if data.get("permalink") and source.startswith("@site/"):
                    sources[data["permalink"]] = source.removeprefix("@site/")
        return sources

    def route(self, path):
        relative = path.relative_to(self.out).as_posix()
        if relative == "index.html":
            return "/"
        if relative.endswith("/index.html"):
            return "/" + relative.removesuffix("index.html")
        return "/" + relative.removesuffix(".html")

    def parse(self, path, **regions):
        page = Page(**regions)
        page.feed(path.read_text(errors="replace"))
        page.close()
        return page

    def page(self, path):
        if path not in self.pages:
            self.pages[path] = self.parse(path)
        return self.pages[path]

    def resolve(self, path):
        """Return the file GitHub Pages serves for a decoded path, or None.

        A path ending in a slash needs its index.html. Otherwise a file, the
        same name with .html, or a directory index resolves; a bare directory
        does not.
        """
        if path == self.base.rstrip("/"):
            path = self.base
        if path not in self.files:
            relative = path[len(self.base) :]
            candidates = (
                [relative + "index.html"]
                if not relative or relative.endswith("/")
                else [relative, relative + ".html", relative + "/index.html"]
            )
            self.files[path] = next(
                (
                    candidate
                    for candidate in (self.out / name for name in candidates)
                    if self.served(candidate)
                ),
                None,
            )
        return self.files[path]

    def served(self, candidate):
        try:
            return candidate.is_file() and candidate.resolve().is_relative_to(self.out)
        except OSError:  # e.g. a segment longer than the file system allows
            return False

    def join(self, route, href):
        """Resolve href from the page served at route, as a browser does.

        The base is absolute, so excess ".." segments stop at the host root.
        """
        served = self.url + self.base + quote(route[1:], safe="/")
        return urlsplit(urljoin(served, browser_href(href)))

    def on_site(self, url):
        """Return the decoded path of a split URL below the base path, or None."""
        if url.scheme not in ("http", "https") or url.netloc.lower() != self.host:
            return None
        # urljoin keeps the dot segments of absolute hrefs, and encoded dots
        # only appear once the path is decoded.
        path = remove_dot_segments(unquote(url.path) or "/")
        return path if (path + "/").startswith(self.base) else None

    def anchored(self, target, fragment):
        """Follow redirect stubs, which keep the fragment, to the final page.

        Returns None when a stub leaves the base path: the anchor is unverifiable.
        """
        for _ in range(5):
            if target.suffix != ".html":
                return True
            page = self.page(target)
            if page.refresh is None:
                return fragment in page.ids
            # The stub is served at its own URL, with a slash for an index.
            path = self.on_site(self.join(self.route(target), page.refresh))
            if path is None:
                return None
            if (target := self.resolve(path)) is None:
                return False
        return False

    def source(self, path, page):
        if page.edit and (match := EDIT_URL.match(page.edit)):
            source = unquote(match[1])
            if (self.root / source).is_file():
                return source
        url = self.base + self.route(path)[1:]
        if url in self.sources:
            return self.sources[url]
        if url == self.base:
            for suffix in SOURCE_SUFFIXES:
                if (self.root / "src/pages" / ("index" + suffix)).is_file():
                    return "src/pages/index" + suffix
        return "docusaurus.config.ts"

    def text(self, source):
        if source not in self.lines:
            try:
                self.lines[source] = (self.root / source).read_text().splitlines()
            except (OSError, UnicodeDecodeError):
                self.lines[source] = []
        return self.lines[source]

    def locate(self, source, href, path, fragment):
        """Best-effort source line: the href as written, then common rewrites."""
        candidates = [href]
        if path.startswith(self.base):
            candidates.append("/" + path[len(self.base) :])
        if fragment:
            name = path.rstrip("/").rsplit("/", 1)[-1]
            candidates += [
                f"{name}.md#{fragment}",
                f"{name}.mdx#{fragment}",
                "#" + fragment,
            ]
        files = [source]
        if source.startswith("src/"):
            # The homepage renders links from its section components.
            files += sorted(
                path.relative_to(self.root).as_posix()
                for path in (self.root / "src").rglob("*")
                if path.suffix in SOURCE_SUFFIXES and path.is_file()
            )
        for candidate in candidates:
            if len(candidate) < 2:
                continue
            for name in files:
                for number, line in enumerate(self.text(name), 1):
                    if candidate in line:
                        return {"path": name, "line": number}
        return {"path": source}

    def scan(self):
        """Return local failures and the external URL inventory."""
        local, external = [], {}
        paths = sorted(self.out.rglob("*.html"))
        # Parse every page before resolving, so each file is read only once.
        for path in paths:
            self.pages[path] = self.parse(path, home=self.route(path) == "/")
        for path in paths:
            page = self.pages[path]
            self.links(path, self.route(path), page, page.links, local, external)
        chrome = self.out / "404.html"
        if chrome.is_file():
            links = self.parse(chrome, chrome=True).links
            self.links(chrome, None, None, links, local, external)
        return {
            "version": 1,
            "site": {"url": self.url, "base": self.base},
            "pages": len(paths),
            "local": local,
            "external": {url: external[url] for url in sorted(external)},
        }

    def links(self, path, route, page, hrefs, local, external):
        source = self.source(path, page) if page else "docusaurus.config.ts"
        owner = fold(route) if route else "chrome"
        route = route or "/404"
        seen = set()
        for raw in hrefs:
            href = raw.strip()
            if href in seen:
                continue
            seen.add(href)
            if not href or href == "#" or href.lower().startswith(IGNORED_SCHEMES):
                continue
            result = self.check(route, href, source, external)
            if result is None:
                continue
            url, key, status, detail, location = result
            if url is not None and len(url) > MAX_URL:
                url, detail = None, TOO_LONG
            if url is None:
                # Without a usable target, the href is reported on its page, in
                # the fragment: the URL still opens that page, and each bad href
                # stays its own finding and exception.
                key = printable(href)
                url = ("site:" + printable(route) + "#" + key)[:MAX_URL]
                location = self.locate(source, href, "", "")
            local.append(
                {
                    "url": url,
                    "page": route,
                    "key": [owner, key],
                    "status": status,
                    "detail": detail,
                    "source": location,
                }
            )

    def check(self, route, href, source, external):
        """Return (url, key, status, detail, source) for a broken href, or None.

        A None url reports the href itself on its page.
        """
        absolute = "https:" + href if href.startswith("//") else href
        try:
            scheme = urlsplit(absolute).scheme
            if scheme not in ("", "http", "https"):
                # A typo such as ghttps:// leads nowhere.
                return None, None, "missing", f"Unsupported URL scheme {scheme}:", None
            target = self.join(route, absolute)
        except ValueError:  # e.g. an unclosed IPv6 bracket in the host
            return None, None, "missing", "Malformed URL", None
        path = self.on_site(target)
        if path is None:
            # Other hosts, and sibling sites on this one such as /archive/0.15/,
            # are requested online.
            url = browser_href(absolute) if scheme else target.geturl()
            return self.remote(url, href, source, external)
        fragment = fragment_id(target.fragment)
        result = self.local(path, fragment)
        if result is None:
            return None
        target_route, status, detail = result
        suffix = "#" + fragment if fragment else ""
        return (
            "site:" + printable(target_route + suffix),
            printable(fold(target_route) + suffix),
            status,
            detail,
            self.locate(source, href, unquote(target.path), target.fragment),
        )

    def local(self, path, fragment):
        """Return (route, status, detail) for a broken link below the base path."""
        route = "/" + path[len(self.base) :] if path != self.base.rstrip("/") else "/"
        target = self.resolve(path)
        if target is None:
            return route, "missing", "No page at this path on GitHub Pages"
        # Without a matching id, browsers scroll to the top for "top" in any case.
        if not fragment or fragment.lower() == "top":
            return None
        found = self.anchored(target, fragment)
        if found is None:
            return (
                route,
                "unknown",
                "Redirect leaves the site, so the anchor is unverifiable",
            )
        if not found:
            return route, "missing", "Anchor is missing from the target page"
        return None

    def remote(self, href, raw, source, external):
        """Inventory an external URL, or return a finding for a same-repository one."""
        url = re.sub(r"[\s<>\"`\x00-\x1f\x7f]", lambda match: quote(match[0]), href)
        if (resolved := self.checker.checkout(url, self.root)) is not None:
            target, fragment = resolved
            try:
                result = inspect_checkout(target, fragment, self.checker.fragment)
            except OSError as error:  # e.g. a name longer than the file system allows
                result = {
                    "status": "missing",
                    "detail": f"Cannot read the file in the checkout: {error.strerror}",
                }
            if result["status"] == "ok":
                return None
            relative = target.relative_to(self.root).as_posix()
            target_url = (
                "repo:/"
                + printable(relative)
                + ("#" + quote(fragment, safe="") if fragment else "")
            )
            parsed = urlsplit(url)
            return (
                target_url,
                target_url,
                "missing" if result["status"] == "missing" else "unknown",
                result["detail"],
                self.locate(source, raw, parsed.path, parsed.fragment),
            )
        if len(key := canonical_url(url)) > MAX_URL:
            return None, None, "missing", TOO_LONG, None
        location = self.locate(source, raw, "", "")
        locations = external.setdefault(key, [])
        if location not in locations:
            locations.append(location)
        return None
