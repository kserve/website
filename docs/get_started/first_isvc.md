## Run your first InferenceService

In this tutorial, you will deploy an InferenceService with a predictor that will load a scikit-learn model trained with
the [iris](https://archive.ics.uci.edu/ml/datasets/iris) dataset. This dataset has three output classes: Iris Setosa, Iris Versicolour, and Iris Virginica.

You will then send an inference request to your deployed model in order to get a prediction for the class of iris plant your request corresponds to.

Since your model is being deployed as an InferenceService, not a raw Kubernetes Service, you just need to provide the storage location of the model and
it gets some **super powers out of the box** :rocket:.


### 1. Create a namespace

First, create a namespace to use for deploying KServe resources:

```shell
kubectl create namespace kserve-test
```

### 2. Create an `InferenceService`

Next, define a new InferenceService YAML for the model and apply it to the cluster.

A new predictor schema was introduced in `v0.8.0`. New `InferenceServices` should be deployed using the new schema. The old schema
is provided as reference.

=== "New Schema"

    ```shell
    kubectl apply -n kserve-test -f - <<EOF
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris"
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    EOF
    ```

=== "Old Schema"

    ```shell
    kubectl apply -n kserve-test -f - <<EOF
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris"
    spec:
      predictor:
        sklearn:
          storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
    EOF
    ```
!!! Warning
    Do not deploy `InferenceServices` in control plane namespaces (i.e. namespaces with `control-plane` label). The webhook is configured
    in a way to skip these namespaces to avoid any privilege escalations. Deploying InferenceServices to these namespaces will result in the storage initializer not being 
    injected into the pod, causing the pod to fail with the error `No such file or directory: '/mnt/models'`.

### 3. Check `InferenceService` status.

```bash
kubectl get inferenceservices sklearn-iris -n kserve-test
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME           URL                                                 READY   PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION                    AGE
    sklearn-iris   http://sklearn-iris.kserve-test.example.com         True           100                              sklearn-iris-predictor-default-47q2g   7d23h
    ```

If your DNS contains example.com please consult your admin for configuring DNS or using [custom domain](https://knative.dev/docs/serving/using-a-custom-domain).

### 4. Determine the ingress IP and ports

Execute the following command to determine if your kubernetes cluster is running in an environment that supports external load balancers
```bash
kubectl get svc istio-ingressgateway -n istio-system
```

!!! success "Expected Output"
    ```{ .bash .no-copy }
    NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)   AGE
    istio-ingressgateway   LoadBalancer   172.21.109.129   130.211.10.121   ...       17h
    ```

=== "Load Balancer"
    If the EXTERNAL-IP value is set, your environment has an external load balancer that you can use for the ingress gateway.

    ```bash
    export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
    ```

=== "Node Port"
    If the EXTERNAL-IP value is none (or perpetually pending), your environment does not provide an external load balancer for the ingress gateway.
    In this case, you can access the gateway using the service’s node port.
    ```bash
    # GKE
    export INGRESS_HOST=worker-node-address
    # Minikube
    export INGRESS_HOST=$(minikube ip)
    # Other environment(On Prem)
    export INGRESS_HOST=$(kubectl get po -l istio=ingressgateway -n istio-system -o jsonpath='{.items[0].status.hostIP}')
    export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
    ```

=== "Port Forward"
    Alternatively you can do `Port Forward` for testing purposes.
    ```bash
    INGRESS_GATEWAY_SERVICE=$(kubectl get svc --namespace istio-system --selector="app=istio-ingressgateway" --output jsonpath='{.items[0].metadata.name}')
    kubectl port-forward --namespace istio-system svc/${INGRESS_GATEWAY_SERVICE} 8080:80
    ```
    Open another terminal, and enter the following:
    ```bash
    export INGRESS_HOST=localhost
    export INGRESS_PORT=8080
    ```

### 5. Perform inference

First, prepare your inference input request inside a file:

```shell
cat <<EOF > "./iris-input.json"
{
  "instances": [
    [6.8,  2.8,  4.8,  1.4],
    [6.0,  3.4,  4.5,  1.6]
  ]
}
EOF
```

Depending on your setup, use one of the following commands to curl the `InferenceService`:

=== "Real DNS"

    If you have configured the DNS, you can directly curl the `InferenceService` with the URL obtained from the status print.
    e.g
    ```bash
    curl -v -H "Content-Type: application/json" http://sklearn-iris.kserve-test.${CUSTOM_DOMAIN}/v1/models/sklearn-iris:predict -d @./iris-input.json
    ```

=== "Magic DNS"

    If you don't want to go through the trouble to get a real domain, you can instead use "magic" dns [xip.io](http://xip.io/).
    The key is to get the external IP for your cluster.
    ```
    kubectl get svc istio-ingressgateway --namespace istio-system
    ```
    Look for the `EXTERNAL-IP` column's value(in this case 35.237.217.209)

    ```bash
    NAME                   TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)                                                                                                                                      AGE
    istio-ingressgateway   LoadBalancer   10.51.253.94   35.237.217.209
    ```

    Next step is to setting up the custom domain:
    ```bash
    kubectl edit cm config-domain --namespace knative-serving
    ```

    Now in your editor, change example.com to \{\{external-ip\}\}.xip.io (make sure to replace \{\{external-ip\}\} with the IP you found earlier).

    With the change applied you can now directly curl the URL
    ```bash
    curl -v -H "Content-Type: application/json" http://sklearn-iris.kserve-test.35.237.217.209.xip.io/v1/models/sklearn-iris:predict -d @./iris-input.json
    ```

=== "From Ingress gateway with HOST Header"

    If you do not have DNS, you can still curl with the ingress gateway external IP using the HOST Header.
    ```bash
    SERVICE_HOSTNAME=$(kubectl get inferenceservice sklearn-iris -n kserve-test -o jsonpath='{.status.url}' | cut -d "/" -f 3)
    curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/sklearn-iris:predict" -d @./iris-input.json
    ```

=== "From local cluster gateway"

    If you are calling from in cluster you can curl with the internal url with host {{InferenceServiceName}}.{{namespace}}
    ```bash
    curl -v -H "Content-Type: application/json" http://sklearn-iris.kserve-test/v1/models/sklearn-iris:predict -d @./iris-input.json
    ```

You should see two predictions returned (i.e. `{"predictions": [1, 1]}`). Both sets of data points sent for inference correspond to the flower with index `1`.
In this case, the model predicts that both flowers are "Iris Versicolour".

### 6. Run performance test (optional)

If you want to load test the deployed model, try deploying the following Kubernetes Job to drive load to the model:

```bash
# use kubectl create instead of apply because the job template is using generateName which doesn't work with kubectl apply
kubectl create -f https://raw.githubusercontent.com/kserve/kserve/release-0.11/docs/samples/v1beta1/sklearn/v1/perf.yaml -n kserve-test
```

Execute the following command to view output:

```bash
kubectl logs load-test8b58n-rgfxr -n kserve-test
```

!!! success "Expected Output"

    ``` { .bash .no-copy }
    Requests      [total, rate, throughput]         30000, 500.02, 499.99
    Duration      [total, attack, wait]             1m0s, 59.998s, 3.336ms
    Latencies     [min, mean, 50, 90, 95, 99, max]  1.743ms, 2.748ms, 2.494ms, 3.363ms, 4.091ms, 7.749ms, 46.354ms
    Bytes In      [total, mean]                     690000, 23.00
    Bytes Out     [total, mean]                     2460000, 82.00
    Success       [ratio]                           100.00%
    Status Codes  [code:count]                      200:30000
    Error Set:
    ```
