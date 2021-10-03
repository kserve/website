# ModelMesh Installation Guide
KServe ModelMesh installation enables high-scale, high-density and frequently-changing model serving use cases.

A Kubernetes cluster is required. You will need cluster-admin authority. Additionally [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) and an [etcd](https://etcd.io/) server on the Kubernetes cluster are required.

## 1. Normal Installation
You can find the normal installation instructions in the ModelMesh Serving [install guide](https://github.com/kserve/modelmesh-serving/blob/main/docs/install/install-script.md).

## 2. Quick Installation
A quick installation allows you to quickly get ModelMesh Serving up and running without having to manually install prerequisites such as etcd. The steps are described in the ModelMesh Serving [quick start guide](https://github.com/kserve/modelmesh-serving/blob/main/docs/README.md).

!!! note
    ModelMesh Serving is namespace scoped, meaning all of its components must exist within a single namespace and only one instance of ModelMesh Serving can be installed per namespace. For more details, you can check out the ModelMesh Serving [environment guide](https://github.com/kserve/modelmesh-serving/blob/main/docs/install/environment.md).
