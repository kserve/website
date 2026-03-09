---
title: "Upgrade Guide"
description: "KServe upgrade guide with release-specific important notes"
---

This guide provides release-specific important information you should know when upgrading KServe. Each release section includes breaking changes, new requirements, and migration steps.

:::tip
Always review the relevant release notes before upgrading in production environments.
:::

## General Upgrade Process

### Using Helm

To upgrade KServe using Helm:

```bash
# Upgrade KServe CRDs (if needed)
helm upgrade kserve-crd oci://ghcr.io/kserve/charts/kserve-crd \
  --version <NEW_VERSION> \
  --namespace kserve

# Upgrade KServe resources
helm upgrade kserve oci://ghcr.io/kserve/charts/kserve \
  --version <NEW_VERSION> \
  --namespace kserve \
  --reuse-values
```

### Using Kustomize

To upgrade KServe using Kustomize:

```bash
# Update the version in your kustomization.yaml or use the new release URL
kubectl apply --server-side -k "github.com/kserve/kserve/config/default?ref=v<NEW_VERSION>"
```

---

## Upgrading to v0.17.0

### v0.17.0 Breaking Changes

:::warning Major Helm Chart Restructuring
**The Helm chart architecture has been completely restructured in v0.17.0:**

- **CRD charts are now separate** from resource charts
- **New charts introduced:**
  - `kserve-crd` - KServe CRDs (previously part of main chart)
  - `kserve-localmodel-crd` - LocalModel CRDs (split from main chart)
  - `kserve-llmisvc-crd` - LLMIsvc CRDs (split from main chart)
  - `kserve-runtime-configs` - ClusterServingRuntimes (new)
- **Resource charts renamed:**
  - `kserve` → `kserve-resources`
  - New: `kserve-localmodel-resources`
  - New: `kserve-llmisvc-resources`

**This requires special migration steps - you cannot simply run `helm upgrade`.**
:::

### v0.17.0 New Requirements

- Helm 3.8+ required
- Existing CRDs and ClusterServingRuntimes need release name annotations updated

### v0.17.0 Important Notes

- **ClusterServingRuntimes and LLMIsvcConfigs** are now managed by the separate `kserve-runtime-configs` chart
- **CRD ownership** changes from `kserve` release to component-specific releases
- The upgrade process requires **annotation management** to prevent resource deletion
- **LLMIsvc resources** now require `kserve.createSharedResources=false` to avoid conflicts
- If using LLMIsvc, set `kserve.llmisvcConfigs.enabled=true` in the `kserve-runtime-configs` chart

### v0.17.0 Migration Steps

:::danger Critical: Follow Steps in Order
**The migration steps MUST be executed in the exact order shown below.**

If you do not follow the correct sequence:

- **ClusterServingRuntimes may be deleted**
- **CRDs may be removed**
- **Existing workloads may be disrupted**

**Recommendation:**

1. **Test the upgrade in a non-production environment first**
2. **Backup your existing configurations** before proceeding
3. **Follow each step carefully** without skipping or reordering

Failure to follow these steps precisely can result in data loss and service disruption.
:::

#### Step 1: Upgrade CRDs

First, protect existing CRDs from deletion and upgrade them:

```bash
# 1. Add keep annotation to all KServe CRDs (prevents deletion during upgrade)
for crd in $(kubectl get crd -o name | grep kserve); do
  echo "Annotating $crd"
  kubectl annotate "$crd" helm.sh/resource-policy=keep --overwrite
done

# 2. Upgrade main KServe CRDs
helm upgrade -i kserve-crd oci://ghcr.io/kserve/charts/kserve-crd \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace

# 3. Change release ownership for LocalModel CRDs
for crd in $(kubectl get crd -o name | grep localmodel); do
  kubectl annotate "$crd" meta.helm.sh/release-name=kserve-localmodel-crd --overwrite
done

# 4. Upgrade LocalModel CRDs
helm upgrade -i kserve-localmodel-crd oci://ghcr.io/kserve/charts/kserve-localmodel-crd \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace

# 5. (Optional) Change release ownership for LLMIsvc CRDs
for crd in $(kubectl get crd -o name | grep llmisvc); do
  kubectl annotate "$crd" meta.helm.sh/release-name=kserve-llmisvc-crd --overwrite
done

# 6. (Optional) Upgrade LLMIsvc CRDs
helm upgrade -i kserve-llmisvc-crd oci://ghcr.io/kserve/charts/kserve-llmisvc-crd \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace

# 7. Remove keep annotation from all CRDs
for crd in $(kubectl get crd -o name | grep kserve); do
  kubectl annotate "$crd" helm.sh/resource-policy- --overwrite
done
```

#### Step 2: Migrate ClusterServingRuntimes and LLMIsvcConfigs

Transfer ClusterServingRuntime and LLMIsvcConfig ownership to the new `kserve-runtime-configs` chart:

```bash
# 1. Add keep annotation to protect ClusterServingRuntimes
for csr in $(kubectl get clusterservingruntime -o name); do
  echo "Annotating $csr"
  kubectl annotate "$csr" helm.sh/resource-policy=keep --overwrite
done

# 2. Add keep annotation to protect LLMIsvcConfigs (if using LLMIsvc)
for config in $(kubectl get llmisvconfig -o name 2>/dev/null); do
  echo "Annotating $config"
  kubectl annotate "$config" helm.sh/resource-policy=keep --overwrite
done

# 3. Change release ownership to kserve-runtime-configs
for csr in $(kubectl get clusterservingruntime -o name); do
  kubectl annotate "$csr" meta.helm.sh/release-name=kserve-runtime-configs --overwrite
done

# 4. Change release ownership for LLMIsvcConfigs (if using LLMIsvc)
for config in $(kubectl get llmisvconfig -o name 2>/dev/null); do
  kubectl annotate "$config" meta.helm.sh/release-name=kserve-runtime-configs --overwrite
done

# 5. Install the new runtime configs chart
# Set llmisvcConfigs.enabled=true if you are using LLMIsvc
helm upgrade -i kserve-runtime-configs \
  oci://ghcr.io/kserve/charts/kserve-runtime-configs \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace \
  --wait \
  --set kserve.servingruntime.enabled=true \
  --set kserve.llmisvcConfigs.enabled=false

# 6. Remove keep annotation from ClusterServingRuntimes
for csr in $(kubectl get clusterservingruntime -o name); do
  kubectl annotate "$csr" helm.sh/resource-policy- --overwrite
done

# 7. Remove keep annotation from LLMIsvcConfigs (if using LLMIsvc)
for config in $(kubectl get llmisvconfig -o name 2>/dev/null); do
  kubectl annotate "$config" helm.sh/resource-policy- --overwrite
done
```

#### Step 3: Upgrade Controllers

Finally, upgrade the controller deployments:

```bash
# 1. Upgrade KServe controller (note: chart name changed to kserve-resources)
# However, please use existing chart name for upgrade.
helm upgrade kserve-resources oci://ghcr.io/kserve/charts/kserve-resources \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace \
  %Add --set if you already used when you installed kserve%

# 2. Upgrade LocalModel controller
helm upgrade kserve-localmodel-resources oci://ghcr.io/kserve/charts/kserve-localmodel-resources \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace

# 3. (Optional) Upgrade LLMIsvc controller
# IMPORTANT: Set createSharedResources=false to avoid conflicts
helm upgrade kserve-llmisvc-resources oci://ghcr.io/kserve/charts/kserve-llmisvc-resources \
  --version v0.17.0 \
  --namespace kserve \
  --create-namespace \
  --set kserve.createSharedResources=false
```

#### Step 4: Verify the Upgrade

```bash
# Check Helm releases
helm list -n kserve

# Expected releases:
# - kserve-crd
# - kserve-localmodel-crd (if using LocalModel)
# - kserve-llmisvc-crd (if using LLMIsvc)
# - kserve-runtime-configs
# - kserve-resources
# - kserve-localmodel-resources (if using LocalModel)
# - kserve-llmisvc-resources (if using LLMIsvc)

# Verify CRDs are present
kubectl get crd | grep kserve

# Verify controllers are running
kubectl get pods -n kserve

# Verify ClusterServingRuntimes
kubectl get clusterservingruntime

# Verify LLMIsvcConfigs (if using LLMIsvc)
kubectl get llmisvconfig
```

## Getting Help

If you encounter issues during upgrade:

- Check the [GitHub Releases](https://github.com/kserve/kserve/releases) for detailed release notes
- Search or create an issue on [GitHub Issues](https://github.com/kserve/kserve/issues)
- Join the [KServe Slack](https://kubeflow.slack.com/archives/CH6E58LNP) for community support
