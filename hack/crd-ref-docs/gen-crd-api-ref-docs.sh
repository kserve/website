#!/bin/bash

# gen-crd-api-ref-docs.sh
# Script to generate CRD API reference documentation using crd-ref-docs tool
# This script temporarily clones the KServe repository and generates API docs

set -euo pipefail # Exit on error, undefined variables, and pipe failures

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
WEBSITE_ROOT="$(dirname "$(dirname "${SCRIPT_DIR}")")"
readonly WEBSITE_ROOT
TEMP_DIR="$(mktemp -d)"
readonly TEMP_DIR
readonly KSERVE_REPO_URL="https://github.com/kserve/kserve.git"
readonly CRD_REF_DOCS_VERSION="latest"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
	echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_warn() {
	echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
	echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_success() {
	echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

# Usage function
usage() {
	cat <<EOF
Usage: $0 [OPTIONS]

Generate CRD API reference documentation for KServe.

OPTIONS:
    -b, --branch BRANCH     KServe repository branch to use (default: master)
    -h, --help             Show this help message
    -v, --verbose          Enable verbose output

EXAMPLES:
    $0                     # Generate docs from master branch
    $0 -b release-0.13     # Generate docs from release-0.13 branch
    $0 --branch v0.12.0    # Generate docs from v0.12.0 tag

EOF
}

# Cleanup function
cleanup() {
	local exit_code=$?
	if [[ -d "${TEMP_DIR}" ]]; then
		log_info "Cleaning up temporary directory: ${TEMP_DIR}"
		rm -rf "${TEMP_DIR}"
	fi
	if [[ ${exit_code} -ne 0 ]]; then
		log_error "Script failed with exit code ${exit_code}"
	fi
	exit ${exit_code}
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Check prerequisites
check_prerequisites() {
	log_info "Checking prerequisites..."

	# Check if Go is installed
	if ! command -v go >/dev/null 2>&1; then
		log_error "Go is not installed or not in PATH"
		return 1
	fi

	# Check if git is installed
	if ! command -v git >/dev/null 2>&1; then
		log_error "Git is not installed or not in PATH"
		return 1
	fi

	# Check if we're in the correct directory structure
	if [[ ! -d "${WEBSITE_ROOT}" ]]; then
		log_error "This script must be run from the website repository root directory"
		return 1
	fi

	log_success "Prerequisites check passed"
	return 0
}

# Install crd-ref-docs tool
install_crd_ref_docs() {
	log_info "Checking crd-ref-docs installation..."

	if command -v crd-ref-docs >/dev/null 2>&1; then
		log_info "crd-ref-docs is already installed"
		return 0
	fi

	log_info "Installing crd-ref-docs..."
	if ! go install github.com/elastic/crd-ref-docs@${CRD_REF_DOCS_VERSION}; then
		log_error "Failed to install crd-ref-docs"
		return 1
	fi

	# Check if the tool is now available
	if ! command -v crd-ref-docs >/dev/null 2>&1; then
		log_error "crd-ref-docs was installed but is not in PATH. Make sure \$GOPATH/bin is in your PATH"
		return 1
	fi

	log_success "crd-ref-docs installed successfully"
	return 0
}

# Clone KServe repository
clone_kserve_repo() {
	local branch="$1"
	local kserve_dir="${TEMP_DIR}/kserve"

	log_info "Cloning KServe repository (branch: ${branch})..."

	if ! git clone --depth 1 --branch "${branch}" "${KSERVE_REPO_URL}" "${kserve_dir}"; then
		log_error "Failed to clone KServe repository with branch '${branch}'"
		log_info "Available branches can be found at: https://github.com/kserve/kserve/branches"
		return 1
	fi

	if [[ ! -d "${kserve_dir}" ]]; then
		log_error "KServe repository directory not found after cloning"
		return 1
	fi

	log_success "KServe repository cloned successfully"
	echo "${kserve_dir}"
	return 0
}

# Verify required files exist in KServe repo
verify_kserve_structure() {
	local kserve_dir="$1"

	log_info "Verifying KServe repository structure..."

	# Check if the required source path exists
	if [[ ! -d "${kserve_dir}/pkg/apis/serving" ]]; then
		log_error "Required source path 'pkg/apis/serving' not found in KServe repository"
		return 1
	fi

	log_success "KServe repository structure verified"
	return 0
}

# Generate CRD documentation
generate_crd_docs() {
	local kserve_dir="$1"
	local verbose="$2"

	log_info "Generating CRD API reference documentation..."

	# Prepare output directory
	local output_dir="${WEBSITE_ROOT}/docs/reference"
	local output_file="${output_dir}/crd-api.mdx"

	if [[ ! -d "${output_dir}" ]]; then
		log_info "Creating output directory: ${output_dir}"
		mkdir -p "${output_dir}"
	fi

	# Check if required config and templates exist
	local config_file="${WEBSITE_ROOT}/hack/crd-ref-docs/config-core.yaml"
	local templates_dir="${WEBSITE_ROOT}/hack/crd-ref-docs/templates"

	if [[ ! -f "${config_file}" ]]; then
		log_warn "Config file not found: ${config_file}"
		log_info "Proceeding without custom config"
		config_file=""
	fi

	if [[ ! -d "${templates_dir}" ]]; then
		log_warn "Templates directory not found: ${templates_dir}"
		log_info "Proceeding with default templates"
		templates_dir=""
	fi

	# Prepare crd-ref-docs command
	local cmd_args=(
		"--source-path=${kserve_dir}/pkg/apis/serving"
		"--max-depth=20"
		"--output-path=${output_file}"
		"--renderer=markdown"
	)

	if [[ -n "${config_file}" ]]; then
		cmd_args+=("--config=${config_file}")
	fi

	if [[ -n "${templates_dir}" ]]; then
		cmd_args+=("--templates-dir=${templates_dir}")
	fi

	# Run the command
	log_info "Running: crd-ref-docs ${cmd_args[*]}"

	if [[ "${verbose}" == "true" ]]; then
		if ! crd-ref-docs "${cmd_args[@]}"; then
			log_error "Failed to generate CRD documentation"
			return 1
		fi
	else
		if ! crd-ref-docs "${cmd_args[@]}" >/dev/null 2>&1; then
			log_error "Failed to generate CRD documentation"
			log_info "Run with -v/--verbose flag to see detailed output"
			return 1
		fi
	fi

	# Verify output file was created
	if [[ ! -f "${output_file}" ]]; then
		log_error "Output file was not created: ${output_file}"
		return 1
	fi

	log_success "CRD API reference documentation generated successfully"
	log_info "Output file: ${output_file}"
	return 0
}

# Main function
main() {
	local branch="master"
	local verbose="false"

	# Parse command line arguments
	while [[ $# -gt 0 ]]; do
		case $1 in
		-b | --branch)
			branch="$2"
			shift 2
			;;
		-h | --help)
			usage
			exit 0
			;;
		-v | --verbose)
			verbose="true"
			shift
			;;
		*)
			log_error "Unknown option: $1"
			usage
			exit 1
			;;
		esac
	done

	log_info "Starting CRD API reference documentation generation"
	log_info "Branch: ${branch}"
	log_info "Verbose: ${verbose}"

	# Check prerequisites
	if ! check_prerequisites; then
		exit 1
	fi

	# Install crd-ref-docs if needed
	if ! install_crd_ref_docs; then
		exit 1
	fi

	# Clone KServe repository
	local kserve_dir
	if ! kserve_dir=$(clone_kserve_repo "${branch}"); then
		exit 1
	fi

	# Verify repository structure
	if ! verify_kserve_structure "${kserve_dir}"; then
		exit 1
	fi

	# Generate documentation
	if ! generate_crd_docs "${kserve_dir}" "${verbose}"; then
		exit 1
	fi

	log_success "CRD API reference documentation generation completed successfully!"
}

# Run main function with all arguments
main "$@"
