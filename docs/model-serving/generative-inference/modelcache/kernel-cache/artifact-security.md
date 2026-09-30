---
title: Kernel Cache Artifact Security
description: Configure signing and verification for Kernel Cache OCI artifacts
---

# Artifact security

Kernel Cache artifacts are OCI images. [Registry authentication](./registry-authentication.md) controls who can push or pull an image; artifact security controls whether KServe accepts the artifact's signature and signer identity. Configure both when the registry and workload trust boundaries require it.

## Configuration

Artifact security is configured in the `kernelcache` JSON object in `inferenceservice-config`.

```yaml title="inferenceservice-config.yaml"
data:
  kernelcache: |-
    {
      "enabled": true,
      "defaultMountType": "oci",
      "artifactSecurity": {
        "mode": "cert",
        "failurePolicy": "reject",
        "cert": {
          "signingProfileRef": "kernelcache-signer",
          "trustBundle": "kserve/kernelcache-root-ca",
          "subjectRegexp": "spiffe://kserve/kernelcache-signer"
        }
      }
    }
```

This is the default artifact security configuration.

The configuration fields are:

- `mode`: `none` or `cert`.
- `failurePolicy`: the current accepted value is `reject`.
- `cert.signingProfileRef`: the operator-managed signing profile used for capture signing.
- `cert.trustBundle`: the trust bundle reference in `namespace/name` form. The referenced Secret is preferred; a ConfigMap is used as a fallback.
- `cert.trustBundleKey`: the key containing the trust bundle. It defaults to `ca.crt`.
- `cert.subjectRegexp`: the regular expression restricting the certificate subject. It is required for certificate verification.

When `mode` is `cert`, `signingProfileRef`, `trustBundle`, and `subjectRegexp` are required. Validate the exact signing profile and trust bundle integration provided by your KServe installation before enabling this mode.

## Mode `none`

With `mode: none`, capture signing and cache verification are skipped by policy. The capture status records a skipped signing result, and the cache status records a skipped verification result.

```json
{
  "mode": "none",
  "failurePolicy": "reject"
}
```

`failurePolicy` remains part of the configuration contract even when signing is disabled.

## Mode `cert`

With `mode: cert`:

1. The capture controller resolves the configured signing profile.
2. The completed artifact is signed through the operator signing integration.
3. The capture is accepted for `KernelCache` creation only when signing succeeds.
4. The cache controller verifies the artifact before node preparation.
5. A verification failure puts the `KernelCache` into an error state and prevents normal preparation.

The digest is part of the signed artifact reference. A signature for a different digest does not make the requested artifact valid.

## Status fields

Capture signing is reported in `KernelCacheCapture.status.signing`:

```yaml
status:
  signing:
    mode: cert
    state: Succeeded
    signed: true
    reason: SigningSucceeded
```

Cache verification is reported in `KernelCache.status.verification`:

```yaml
status:
  verification:
    mode: cert
    state: Succeeded
    verified: true
    reason: VerificationSucceeded
```

Security state values include `Pending`, `Succeeded`, `Failed`, and `Skipped`. Useful failure reasons include `SigningProfileNotFound`, `SignerUnavailable`, `SigningFailed`, `InvalidArtifactReference`, `SignedDigestMismatch`, `VerifierUnavailable`, `VerificationError`, `VerifiedDigestMismatch`, and `VerificationFailed`.

## Operational checks

```bash
kubectl get kernelcachecapture <capture-name> -n <namespace> -o jsonpath='{.status.signing}{"\n"}'
kubectl get kernelcache <cache-name> -n <namespace> -o jsonpath='{.status.verification}{"\n"}'
kubectl describe kernelcache <cache-name> -n <namespace>
kubectl get events -n <namespace> --sort-by=.lastTimestamp
```

When verification fails, check the artifact digest, trust bundle contents, certificate subject, signing profile availability, and controller permissions. Changing the trust bundle or signer does not change an existing artifact digest; recapture or republish the artifact when the signed content must change.

## Security boundaries

- Do not place private signing keys in a `KernelCache` or `KernelCacheCapture` object.
- Use digest references for both runtime images and cache artifacts when reproducibility matters.
- Treat `mode: none` as an explicit decision to skip artifact verification.
- Keep registry push and pull roles scoped to the repositories and namespaces required by the installation.
