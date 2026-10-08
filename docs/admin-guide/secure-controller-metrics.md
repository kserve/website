---
title: "Secure Controller Metrics"
description: "Configure HTTPS authentication and authorization for KServe controller metrics"
---

# Secure Controller Metrics

KServe controllers expose Prometheus metrics for monitoring the control plane. You can protect these endpoints with either a `kube-rbac-proxy` sidecar or the controllers' native secure metrics server.

This guide is for cluster administrators customizing an existing KServe installation. It assumes permission to modify controller workloads, certificates, Services, and cluster-wide RBAC.

## Metrics security modes

- **`kube-rbac-proxy`:** The standard KServe controller manager installation uses this sidecar to terminate HTTPS, perform Kubernetes authentication and authorization, and forward plaintext HTTP to the manager over the pod loopback interface.
- **Native secure metrics:** The controller serves HTTPS and performs Kubernetes authentication and authorization directly. This mode is disabled by default for the KServe controller manager, LocalModel controller, and LocalModel node agent, and enabled by default for the LLMInferenceService controller.

Keep the mode provided by your installation unless your monitoring integration requires a different one. Use only one authentication layer.

:::warning

The default `kube-rbac-proxy` upstream uses HTTP and cannot connect to a native HTTPS metrics endpoint. Remove the sidecar when enabling native secure metrics. Although the proxy can be configured with an HTTPS upstream, doing so duplicates authentication and authorization and is not recommended.

:::

## Native secure metrics arguments

Configure the native server through arguments on the controller workload:

| Argument | Description |
| --- | --- |
| `--metrics-secure` | Serve metrics over HTTPS and authenticate and authorize requests using the Kubernetes API. |
| `--metrics-cert-path` | Directory containing `tls.crt` and `tls.key`. When omitted, the controller generates a self-signed certificate for `localhost` and `127.0.0.1`. |
| `--metrics-addr` | Address and port on which the metrics server listens. |

For verified scraping through a Kubernetes Service, use `--metrics-cert-path` with a certificate containing the Service DNS name in its subject alternative names (SANs). Both files must be present or the controller will fail to start. The generated certificate is ephemeral and contains only the loopback names.

## Configure a Kustomize installation

Create a TLS Secret named `kserve-controller-metrics-tls` in the `kserve` namespace. Its certificate must include `kserve-controller-manager-metrics-service.kserve.svc` and, if used, the fully qualified name with your cluster domain. Then add this patch to a Kustomize overlay that includes the standard KServe manifests:

```yaml title="secure-metrics-patch.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kserve-controller-manager
  namespace: kserve
spec:
  template:
    spec:
      containers:
        - name: kube-rbac-proxy
          $patch: delete
        - name: manager
          args:
            - "--metrics-addr=:8443"
            - "--metrics-secure"
            - "--metrics-cert-path=/etc/kserve/metrics-certs"
            - "--leader-elect"
          ports:
            - containerPort: 8443
              name: https
              protocol: TCP
          volumeMounts:
            - name: metrics-cert
              mountPath: /etc/kserve/metrics-certs
              readOnly: true
      volumes:
        - name: metrics-cert
          secret:
            secretName: kserve-controller-metrics-tls
```

Include the patch in the overlay's `kustomization.yaml`:

```yaml
patches:
  - path: secure-metrics-patch.yaml
```

The `args` list replaces the existing list, so preserve any other arguments required by your installation. The standard metrics Service already targets the port named `https`.

LocalModel components do not include `kube-rbac-proxy` or a metrics Service by default. Patch their workloads similarly and configure either Prometheus pod discovery or a Service for the secure port.

## Configure a Helm installation

The LLMInferenceService chart enables native secure metrics by default and exposes the settings needed to provide a stable serving certificate:

```yaml title="values.yaml"
kserve:
  llmisvc:
    controller:
      metricsBindAddress: 0.0.0.0
      metricsBindPort: "8443"
      extraArgs:
        - "--metrics-cert-path=/etc/kserve/metrics-certs"
      extraVolumeMounts:
        - name: metrics-cert
          mountPath: /etc/kserve/metrics-certs
          readOnly: true
      extraVolumes:
        - name: metrics-cert
          secret:
            secretName: llmisvc-metrics-cert
```

The Secret must contain `tls.crt` and `tls.key`, with a certificate valid for the controller Service rendered by the release.

The KServe and LocalModel charts do not currently expose arbitrary controller arguments. Use a Helm post-renderer to apply the equivalent workload patch for those components.

## Configure authentication and authorization

Native secure metrics use Kubernetes `TokenReview` and `SubjectAccessReview`. The controller ServiceAccount needs permission to create both resources; the standard manifests grant these permissions, but custom RBAC must preserve them.

A client scraping a native secure metrics endpoint must:

- Trust the certificate presented by the controller.
- Present a Kubernetes bearer token.
- Have `get` permission for the `/metrics` non-resource URL.

The full KServe installation provides the `kserve-metrics-reader` `ClusterRole`. Bind it to the scraper's ServiceAccount. Component-only or customized installations must provide an equivalent role if it is absent. Configure the scraper to use HTTPS, its bearer token, and the CA that issued the serving certificate.
