#!/usr/bin/env bash
#
# Before running this script, set KSERVE_COMMIT if building docs from upstream.
# To test or build from local changes, comment out KSERVE_COMMIT and
# clone_at_commit() lines.

# Usage: ./gen-api-reference-docs.sh


set -euo pipefail

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
[[ -n "${DEBUG:-}" ]] && set -x

REFDOCS_PKG="github.com/ahmetb/gen-crd-api-reference-docs"
REFDOCS_REPO="https://${REFDOCS_PKG}.git"
REFDOCS_VER="v0.3.0"

KSERVE_REPO="github.com/kserve/kserve"
KSERVE_IMPORT_PATH="kserve.io/serving"
KSERVE_COMMIT="${KSERVE_COMMIT:?specify the \$KSERVE_COMMIT variable}"
KSERVE_OUT_FILE="api.md"

cleanup_refdocs_root=
cleanup_gopath_root=
cleanup_out_root=
trap cleanup EXIT

log() {
    echo "$@" >&2
}

fail() {
    log "error: $*"
    exit 1
}

install_go_bin() {
    local pkg
    pkg="$1"
    (
        cd "$(mktemp -d)"
        go mod init tmp
        go install "$pkg"
    )
}

repo_tarball_url() {
    local repo commit
    repo="$1"
    commit="$2"
    echo "https://$repo/archive/$commit.tar.gz"
}

clone_at_commit() {
    local repo commit dest
    repo="$1"
    commit="$2"
    dest="$3"
    mkdir -p "${dest}"
    git clone "${repo}" "${dest}"
    git --git-dir="${dest}/.git" --work-tree="${dest}" checkout --detach --quiet "${commit}"
}

gen_refdocs() {
    local refdocs_bin template_dir out_file repo_root api_dir
    refdocs_bin="$1"
    template_dir="$2"
    out_file="$3"
    repo_root="$4"
    api_dir="$5"

    (
        cd "${repo_root}"
        "${refdocs_bin}" \
            -out-file "${out_file}" \
            -api-dir "${api_dir}" \
            -template-dir "${template_dir}" \
            -config "${SCRIPTDIR}/reference-docs-gen-config.json"
    )
}

cleanup() {
    if [ -d "${cleanup_refdocs_root}" ]; then
        echo "Cleaning up tmp directory: ${cleanup_refdocs_root}"
        rm -rf -- "${cleanup_refdocs_root}"
    fi
    if [ -d "${cleanup_gopath_root}" ]; then
        echo "Cleaning up tmp directory: ${cleanup_gopath_root}"
        rm -rf -- "${cleanup_gopath_root}"
    fi
    if [ -d "${cleanup_out_root}" ]; then
        echo "Cleaning up tmp directory: ${cleanup_out_root}"
        rm -rf -- "${cleanup_out_root}"
    fi
}

main() {
    if ! command -v "go" 1>/dev/null ; then
        fail "\"go\" is not in PATH"
    fi
    if ! command -v "git" 1>/dev/null ; then
        fail "\"git\" is not in PATH"
    fi

    # install and place the refdocs tool
    local refdocs_bin refdocs_bin_expected refdocs_dir template_dir
    refdocs_dir="$(mktemp -d)"
    cleanup_refdocs_root="${refdocs_dir}"
    # clone repo for ./templates
    git clone --quiet --depth=1 "${REFDOCS_REPO}" "${refdocs_dir}"
    template_dir="${refdocs_dir}/template"
    # install bin
    gopath="$(mktemp -d)"
    cleanup_gopath_root="${gopath}"
    export GOPATH="${gopath}"
    install_go_bin "${REFDOCS_PKG}@${REFDOCS_VER}"
    # move bin to final location
    refdocs_bin="${refdocs_dir}/refdocs"
    refdocs_bin_expected="${GOPATH}/bin/$(basename ${REFDOCS_PKG})"
    mv "${refdocs_bin_expected}" "${refdocs_bin}"
    [[ ! -f "${refdocs_bin}" ]] && fail "refdocs failed to install"

    local out_dir kserve_root
    out_dir="$(mktemp -d)"
    cleanup_out_root="${out_dir}"
    kserve_root="${GOPATH}/src/${KSERVE_IMPORT_PATH}"
    # use local path if building docs from local changes
    # kserve_root="/Users/hpham111/git/kserve"
    clone_at_commit "https://${KSERVE_REPO}.git" "${KSERVE_COMMIT}" \
        "${kserve_root}"
    gen_refdocs "${refdocs_bin}" "${template_dir}" \
        "${out_dir}/v1alpha1.md" "${kserve_root}" "./pkg/apis/serving/v1alpha1"
    gen_refdocs "${refdocs_bin}" "${template_dir}" \
        "${out_dir}/v1beta1.md" "${kserve_root}" "./pkg/apis/serving/v1beta1"

    v1alpha1_doc="${out_dir}/v1alpha1.md"
    v1beta1_doc="${out_dir}/v1beta1.md"

    # Remove first 6 lines which contains packages list
    sed -i '1,6d' "$v1alpha1_doc"
    sed -i '1,6d' "$v1beta1_doc"

    # Add the modified packages list to output file
    cat <<EOF > "${out_dir}/${KSERVE_OUT_FILE}"
<p>Packages:</p>
<ul>
<li>
<a href="#serving.kserve.io/v1alpha1">serving.kserve.io/v1alpha1</a>
</li>
<li>
<a href="#serving.kserve.io/v1beta1">serving.kserve.io/v1beta1</a>
</li>
</ul>
EOF

    # Append the v1alpha and v1beta1 docs to the output file
    cat "${v1alpha1_doc}" >> "${out_dir}/${KSERVE_OUT_FILE}"
    cat "${v1beta1_doc}" >> "${out_dir}/${KSERVE_OUT_FILE}"

    cp "${out_dir}/${KSERVE_OUT_FILE}" "$SCRIPTDIR/../reference/${KSERVE_OUT_FILE}"
    go clean -modcache

    # echo "Applying patches..."
    # git apply $SCRIPTDIR/patches/*.patch
}

main "$@"
