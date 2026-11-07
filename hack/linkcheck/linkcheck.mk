# Documentation link checks on the built site. See hack/linkcheck/README.md.

LINKCHECK_DIR := hack/linkcheck
include $(LINKCHECK_DIR)/lychee.env

LOCALBIN ?= $(CURDIR)/bin
LYCHEE ?= $(LOCALBIN)/lychee
SITE_DIR ?= build
LINK_FACTS ?= $(LOCALBIN)/link-check/facts.json
# Network checks need GITHUB_TOKEN for GitHub targets. Use --offline for
# built-site links only, --base-facts <facts.json> for PR regressions, or
# --advisory for the full backlog.
LINK_CHECK_ARGS ?=

$(LOCALBIN):
	mkdir -p "$(LOCALBIN)"

.PHONY: lychee
lychee: $(LYCHEE)
$(LYCHEE): $(LINKCHECK_DIR)/lychee.env $(LINKCHECK_DIR)/install-lychee.sh $(LINKCHECK_DIR)/lychee-checksums.txt | $(LOCALBIN)
	@[ -f "$(LYCHEE)-$(LYCHEE_VERSION)" ] || { \
	BIN_DIR="$(LOCALBIN)" $(LINKCHECK_DIR)/install-lychee.sh && \
	mv "$(LYCHEE)" "$(LYCHEE)-$(LYCHEE_VERSION)"; \
	} || exit $$?; \
	ln -sf "$$(basename "$(LYCHEE)-$(LYCHEE_VERSION)")" "$(LYCHEE)"

# Same build as the GitHub Pages deployment, so links resolve as they do live.
.PHONY: build-site
build-site:
	NODE_ENV=production npx docusaurus build --out-dir "$(SITE_DIR)"

.PHONY: check-links
check-links: lychee
	@python3 hack/check-links.py scan --lychee "$(LYCHEE)" --site "$(SITE_DIR)" --output "$(LINK_FACTS)"
	@python3 hack/check-links.py gate --lychee "$(LYCHEE)" --facts "$(LINK_FACTS)" $(LINK_CHECK_ARGS)

.PHONY: test-links
test-links: lychee
	@LYCHEE_TEST_BINARY="$(LYCHEE)" python3 -m unittest discover -s hack/tests -p 'test*link*.py'

# Read-only preview by default. Only the trusted nightly workflow publishes.
.PHONY: triage-links
triage-links:
	@python3 hack/triage-doc-links.py
