---
title: Registry authentication
description: Configure registry access for Kernel Cache artifacts
---

# Registry authentication

Kernel Cache writes captured runtime output to an OCI registry and later reads it during node preparation. By default, `registry.auth.type` is `none`, so Kernel Cache does not provision registry credentials.

Use `serviceAccountToken` when the registry accepts Kubernetes ServiceAccount tokens. The controller requests short-lived tokens through the Kubernetes TokenRequest API and creates the ServiceAccounts and RoleBindings needed for a capture push and a cache preparation pull.

## Use an insecure registry

For a registry served over plain HTTP, set `registry.insecure` to `true` in the `kernelcache` section of the `inferenceservice-config` ConfigMap.

```json
{
  "registry": {
    "endpoint": "registry.example.com:5000",
    "insecure": true,
    "auth": {
      "type": "none"
    }
  }
}
```

`insecure: true` enables plain HTTP registry access. It is not required for an HTTPS registry using a private CA; use `registry.caConfigMapRef` for that case.

## Configure serviceAccountToken

Set both role references in the `kernelcache.registry.auth` configuration. They must name existing `Role` or `ClusterRole` objects that grant the registry permissions required for each operation.

```json
{
  "registry": {
    "endpoint": "registry.example.com",
    "auth": {
      "type": "serviceAccountToken",
      "tokenTTLSeconds": 600,
      "pushRoleRef": {
        "kind": "ClusterRole",
        "name": "registry-pusher"
      },
      "pullRoleRef": {
        "kind": "ClusterRole",
        "name": "registry-puller"
      }
    }
  }
}
```

The token lifetime defaults to 600 seconds and must be from 600 through 3600 seconds. Use `registry.caConfigMapRef` to provide a registry CA when the registry uses a private CA.

The controller manages the bindings that assign these roles. It creates a push binding for each capture in the capture namespace, and a pull binding for each cache in the cache namespace. Do not create these generated bindings manually.

If a namespaced `Role` is referenced, create the push role in the capture namespace and the pull role in the namespace that contains the `KernelCache`. A `ClusterRole` can be used for roles shared across namespaces.

## Grant controller bind permission

To create those generated bindings, the KServe controller ServiceAccount needs `bind` permission for each configured role. The Kernel Cache installation grants `bind` only for its internal token requester role. A cluster administrator must grant additional, resource-name-scoped permission before you configure registry roles.

Do not grant unrestricted `bind` permission. Limit it to the exact `Role` or `ClusterRole` names used by `pushRoleRef` and `pullRoleRef`.

## OpenShift integrated registry example

OpenShift's integrated registry accepts ServiceAccount tokens. The following configuration uses OpenShift's `system:image-builder` role for capture pushes and `system:image-puller` for cache preparation pulls. Set `enabled` to `true` when enabling Kernel Cache.

```json title="inferenceservice-config.yaml"
{
  "enabled": true,
  "defaultSidecarInjection": true,
  "defaultMountType": "oci",
  "defaultNodeGroup": "",
  "jobNamespace": "kserve-kernelcache-jobs",
  "mcvImage": "quay.io/gkm/mcv:latest",
  "prefetchImage": "registry.access.redhat.com/ubi9/ubi-minimal:latest",
  "registry": {
    "endpoint": "image-registry.openshift-image-registry.svc:5000",
    "caConfigMapRef": {
      "name": "openshift-service-ca.crt",
      "key": "service-ca.crt"
    },
    "auth": {
      "type": "serviceAccountToken",
      "tokenTTLSeconds": 600,
      "pushRoleRef": {
        "kind": "ClusterRole",
        "name": "system:image-builder"
      },
      "pullRoleRef": {
        "kind": "ClusterRole",
        "name": "system:image-puller"
      }
    }
  },
  "artifactSecurity": {
    "mode": "cert",
    "failurePolicy": "reject",
    "cert": {
      "signingProfileRef": "kernelcache-signer",
      "trustBundle": "kserve/kernelcache-root-ca",
      "subjectRegexp": "spiffe://kserve/kernelcache-signer"
    }
  },
  "abandonedCapturePolicy": "retain",
  "jobTTLSecondsAfterFinished": 600,
  "mcvCaptureReadinessTimeoutSeconds": 600,
  "reconcileIntervalSeconds": 300
}
```

The KServe controller ServiceAccount is `kserve-localmodel-controller-manager` in the `kserve` namespace. Because the configured OpenShift roles are `ClusterRole` objects, `bind` permission is cluster-scoped. A cluster administrator must create this `ClusterRole` and `ClusterRoleBinding` before enabling `serviceAccountToken`:

```yaml title="kernelcache-openshift-registry-rbac.yaml"
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kserve-kernelcache-openshift-registry-binder
rules:
- apiGroups:
  - rbac.authorization.k8s.io
  resources:
  - clusterroles
  resourceNames:
  - system:image-builder
  - system:image-puller
  verbs:
  - bind
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kserve-kernelcache-openshift-registry-binder
  namespace: kserve
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kserve-kernelcache-openshift-registry-binder
subjects:
- kind: ServiceAccount
  name: kserve-localmodel-controller-manager
  namespace: kserve
```

```bash
oc apply -f kernelcache-openshift-registry-rbac.yaml
oc auth can-i bind clusterroles/system:image-builder \
  --as=system:serviceaccount:kserve:kserve-localmodel-controller-manager
oc auth can-i bind clusterroles/system:image-puller \
  --as=system:serviceaccount:kserve:kserve-localmodel-controller-manager
```

This administrator-managed binding authorizes the controller to bind only those two OpenShift roles. It does not replace the push and pull RoleBindings created by the controller.
