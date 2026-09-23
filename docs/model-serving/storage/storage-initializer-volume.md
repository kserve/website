---
title: Storage Initializer Volume
description: Configure the staging volume used by the KServe storage initializer to improve I/O performance or redirect model downloads away from the node system disk.
---

# Storage Initializer Volume

When KServe downloads a model artifact, the storage initializer init container writes to a shared staging volume (`kserve-provision-location`) that the model server then reads from. By default this volume is an `emptyDir`, which resides on the node's system disk. For large models this can create disk pressure on the node, increase cold-start latency, or prevent integration with storage acceleration layers that require a specific volume type.

This feature lets you replace the default `emptyDir` with any Kubernetes `VolumeSource` — such as an ephemeral volume backed by a fast local StorageClass, a pre-created PVC, or a PVC-backed caching layer — either cluster-wide or per service.

:::note
`pvc://` storage URIs are unaffected. When a `pvc://` URI is used, the PVC from the URI always takes priority and `modelVolumeSource` is ignored.
:::

## Cluster-wide default

To apply a volume type to all `InferenceService` pods, set `modelVolumeSource` in the `inferenceservice-config` ConfigMap and restart the controller.

```bash
kubectl edit configmap inferenceservice-config -n kserve
```

Add or update the `modelVolumeSource` key inside the `storageInitializer` JSON value:

```json
"storageInitializer": {
  "...",
  "modelVolumeSource": {
    "ephemeral": {
      "volumeClaimTemplate": {
        "spec": {
          "accessModes": ["ReadWriteOnce"],
          "storageClassName": "your-storage-class",
          "resources": {
            "requests": {
              "storage": "50Gi"
            }
          }
        }
      }
    }
  }
}
```

After saving, restart the KServe controller:

```bash
kubectl rollout restart deployment kserve-controller-manager -n kserve
```

All new pods will automatically use the configured volume. No changes to individual `InferenceService` manifests are required.

## Per-service override

To override the volume for a single `InferenceService`, add a volume named `kserve-provision-location` to `spec.predictor.volumes`. This takes precedence over the cluster-wide ConfigMap setting.

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: my-model
spec:
  predictor:
    volumes:
      - name: kserve-provision-location
        ephemeral:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              storageClassName: your-storage-class
              resources:
                requests:
                  storage: 50Gi
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
```

If a volume named `kserve-provision-location` already exists in the pod spec, KServe skips injecting one — this is what makes the per-service override work.

## Precedence

| Configuration | Priority |
|---|---|
| `pvc://` storage URI | Highest — always used, ignores `modelVolumeSource` |
| Per-service `kserve-provision-location` volume | Overrides ConfigMap default |
| `storageInitializer.modelVolumeSource` in ConfigMap | Cluster-wide default |
| No configuration | `emptyDir` (default behavior, unchanged) |

## fsGroup considerations

Some storage backends — including block storage CSI drivers and PVC-backed caching layers — mount volumes owned by root. Because the default KServe storage initializer image runs as uid/gid 1000, writes to such volumes will fail with a permission error.

To resolve this, set `securityContext.fsGroup: 1000` on the pod spec so the kubelet chowns the volume before the container starts:

```yaml
spec:
  predictor:
    podSpec:
      securityContext:
        fsGroup: 1000
```

KServe does not set `fsGroup` automatically to avoid unintended side effects on user-supplied containers. If your CSI driver is configured with `fsGroupPolicy: File`, the driver handles ownership automatically and no pod-level setting is needed.
