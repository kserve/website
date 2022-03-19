# ModelMesh Installation Guide
KServe ModelMesh installation enables high-scale, high-density and frequently-changing model serving use cases.

A Kubernetes cluster is required. You will need cluster-admin authority. Additionally [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) and an [etcd](https://etcd.io/) server on the Kubernetes cluster are required.

## 1. Standard Installation
You can find the standard installation instructions in the ModelMesh Serving [installation guide](https://github.com/kserve/modelmesh-serving/blob/release-0.8/docs/install/install-script.md). This approach assumes you have installed the prerequisites such as etcd and S3-compatible object storage.

## 2. Quick Installation
A quick installation allows you to quickly get ModelMesh Serving up and running without having to manually install the prerequisites. The steps are described in the ModelMesh Serving [quick start guide](https://github.com/kserve/modelmesh-serving/blob/release-0.8/docs/quickstart.md).

!!! note
    ModelMesh Serving is namespace scoped, meaning all of its components must exist within a single namespace and only one instance of ModelMesh Serving can be installed per namespace. For more details, you can check out the ModelMesh Serving [getting started guide](https://github.com/kserve/modelmesh-serving/blob/release-0.8/docs/install/README.md).
