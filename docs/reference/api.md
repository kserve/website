<p>Packages:</p>
<ul>
<li>
<a href="#serving.kserve.io%2fv1beta1">serving.kserve.io/v1beta1</a>
</li>
</ul>
<h2 id="serving.kserve.io/v1beta1">serving.kserve.io/v1beta1</h2>
<div>
<p>Package v1beta1 contains API Schema definitions for the serving v1beta1 API group</p>
</div>
Resource Types:
<ul></ul>
<h3 id="serving.kserve.io/v1beta1.ARTExplainerSpec">ARTExplainerSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ExplainerSpec">ExplainerSpec</a>)
</p>
<div>
<p>ARTExplainerType defines the arguments for configuring an ART Explanation Server</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>type</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ARTExplainerType">
ARTExplainerType
</a>
</em>
</td>
<td>
<p>The type of ART explainer</p>
</td>
</tr>
<tr>
<td>
<code>ExplainerExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainerExtensionSpec">
ExplainerExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>ExplainerExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all explainers</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ARTExplainerType">ARTExplainerType
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ARTExplainerSpec">ARTExplainerSpec</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;SquareAttack&#34;</p></td>
<td></td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.AlibiExplainerSpec">AlibiExplainerSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ExplainerSpec">ExplainerSpec</a>)
</p>
<div>
<p>AlibiExplainerSpec defines the arguments for configuring an Alibi Explanation Server</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>type</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.AlibiExplainerType">
AlibiExplainerType
</a>
</em>
</td>
<td>
<p>The type of Alibi explainer <br />
Valid values are: <br />
- &ldquo;AnchorTabular&rdquo;; <br />
- &ldquo;AnchorImages&rdquo;; <br />
- &ldquo;AnchorText&rdquo;; <br />
- &ldquo;Counterfactuals&rdquo;; <br />
- &ldquo;Contrastive&rdquo;; <br /></p>
</td>
</tr>
<tr>
<td>
<code>ExplainerExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainerExtensionSpec">
ExplainerExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>ExplainerExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all explainers</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.AlibiExplainerType">AlibiExplainerType
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.AlibiExplainerSpec">AlibiExplainerSpec</a>)
</p>
<div>
<p>AlibiExplainerType is the explanation method</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;AnchorImages&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;AnchorTabular&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;AnchorText&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;Contrastive&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;Counterfactuals&#34;</p></td>
<td></td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.Batcher">Batcher
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ComponentExtensionSpec">ComponentExtensionSpec</a>)
</p>
<div>
<p>Batcher specifies optional payload batching available for all components</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>maxBatchSize</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specifies the max number of requests to trigger a batch</p>
</td>
</tr>
<tr>
<td>
<code>maxLatency</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specifies the max latency to trigger a batch</p>
</td>
</tr>
<tr>
<td>
<code>timeout</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specifies the timeout of a batch</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.Component">Component
</h3>
<div>
<p>Component interface is implemented by all specs that contain component implementations, e.g. PredictorSpec, ExplainerSpec, TransformerSpec.</p>
</div>
<h3 id="serving.kserve.io/v1beta1.ComponentExtensionSpec">ComponentExtensionSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ExplainerSpec">ExplainerSpec</a>, <a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>, <a href="#serving.kserve.io/v1beta1.TransformerSpec">TransformerSpec</a>)
</p>
<div>
<p>ComponentExtensionSpec defines the deployment configuration for a given InferenceService component</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>minReplicas</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>Minimum number of replicas, defaults to 1 but can be set to 0 to enable scale-to-zero.</p>
</td>
</tr>
<tr>
<td>
<code>maxReplicas</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>Maximum number of replicas for autoscaling.</p>
</td>
</tr>
<tr>
<td>
<code>scaleTarget</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>ScaleTarget specifies the integer target value of the metric type the Autoscaler watches for.
concurrency and rps targets are supported by Knative Pod Autoscaler
(<a href="https://knative.dev/docs/serving/autoscaling/autoscaling-targets/">https://knative.dev/docs/serving/autoscaling/autoscaling-targets/</a>).</p>
</td>
</tr>
<tr>
<td>
<code>scaleMetric</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ScaleMetric">
ScaleMetric
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>ScaleMetric defines the scaling metric type watched by autoscaler
possible values are concurrency, rps, cpu, memory. concurrency, rps are supported via
Knative Pod Autoscaler(<a href="https://knative.dev/docs/serving/autoscaling/autoscaling-metrics">https://knative.dev/docs/serving/autoscaling/autoscaling-metrics</a>).</p>
</td>
</tr>
<tr>
<td>
<code>containerConcurrency</code><br/>
<em>
int64
</em>
</td>
<td>
<em>(Optional)</em>
<p>ContainerConcurrency specifies how many requests can be processed concurrently, this sets the hard limit of the container
concurrency(<a href="https://knative.dev/docs/serving/autoscaling/concurrency">https://knative.dev/docs/serving/autoscaling/concurrency</a>).</p>
</td>
</tr>
<tr>
<td>
<code>timeout</code><br/>
<em>
int64
</em>
</td>
<td>
<em>(Optional)</em>
<p>TimeoutSeconds specifies the number of seconds to wait before timing out a request to the component.</p>
</td>
</tr>
<tr>
<td>
<code>canaryTrafficPercent</code><br/>
<em>
int64
</em>
</td>
<td>
<em>(Optional)</em>
<p>CanaryTrafficPercent defines the traffic split percentage between the candidate revision and the last ready revision</p>
</td>
</tr>
<tr>
<td>
<code>logger</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.LoggerSpec">
LoggerSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Activate request/response logging and logger configurations</p>
</td>
</tr>
<tr>
<td>
<code>batcher</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.Batcher">
Batcher
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Activate request batching and batching configurations</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ComponentImplementation">ComponentImplementation
</h3>
<div>
<p>ComponentImplementation interface is implemented by predictor, transformer, and explainer implementations</p>
</div>
<h3 id="serving.kserve.io/v1beta1.ComponentStatusSpec">ComponentStatusSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServiceStatus">InferenceServiceStatus</a>)
</p>
<div>
<p>ComponentStatusSpec describes the state of the component</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>latestReadyRevision</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Latest revision name that is in ready state</p>
</td>
</tr>
<tr>
<td>
<code>latestCreatedRevision</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Latest revision name that is created</p>
</td>
</tr>
<tr>
<td>
<code>previousRolledoutRevision</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Previous revision name that is rolled out with 100 percent traffic</p>
</td>
</tr>
<tr>
<td>
<code>latestRolledoutRevision</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Latest revision name that is rolled out with 100 percent traffic</p>
</td>
</tr>
<tr>
<td>
<code>traffic</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/serving/pkg/apis/serving/v1#TrafficTarget">
[]knative.dev/serving/pkg/apis/serving/v1.TrafficTarget
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Traffic holds the configured traffic distribution for latest ready revision and previous rolled out revision.</p>
</td>
</tr>
<tr>
<td>
<code>url</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis#URL">
knative.dev/pkg/apis.URL
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>URL holds the primary url that will distribute traffic over the provided traffic targets.
This will be one the REST or gRPC endpoints that are available.
It generally has the form http[s]://{route-name}.{route-namespace}.{cluster-level-suffix}</p>
</td>
</tr>
<tr>
<td>
<code>restUrl</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis#URL">
knative.dev/pkg/apis.URL
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>REST endpoint of the component if available.</p>
</td>
</tr>
<tr>
<td>
<code>grpcUrl</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis#URL">
knative.dev/pkg/apis.URL
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>gRPC endpoint of the component if available.</p>
</td>
</tr>
<tr>
<td>
<code>address</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis/duck/v1#Addressable">
knative.dev/pkg/apis/duck/v1.Addressable
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Addressable endpoint for the InferenceService</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ComponentType">ComponentType
(<code>string</code> alias)</h3>
<div>
<p>ComponentType contains the different types of components of the service</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;explainer&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;predictor&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;transformer&#34;</p></td>
<td></td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.CustomExplainer">CustomExplainer
</h3>
<div>
<p>CustomExplainer defines arguments for configuring a custom explainer.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PodSpec</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podspec-v1-core">
Kubernetes core/v1.PodSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PodSpec</code> are embedded into this type.)
</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.CustomPredictor">CustomPredictor
</h3>
<div>
<p>CustomPredictor defines arguments for configuring a custom server.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PodSpec</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podspec-v1-core">
Kubernetes core/v1.PodSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PodSpec</code> are embedded into this type.)
</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.CustomTransformer">CustomTransformer
</h3>
<div>
<p>CustomTransformer defines arguments for configuring a custom transformer.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PodSpec</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podspec-v1-core">
Kubernetes core/v1.PodSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PodSpec</code> are embedded into this type.)
</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.DeployConfig">DeployConfig
</h3>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>defaultDeploymentMode</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ExplainerConfig">ExplainerConfig
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ExplainersConfig">ExplainersConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>image</code><br/>
<em>
string
</em>
</td>
<td>
<p>explainer docker image name</p>
</td>
</tr>
<tr>
<td>
<code>defaultImageVersion</code><br/>
<em>
string
</em>
</td>
<td>
<p>default explainer docker image version</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ExplainerExtensionSpec">ExplainerExtensionSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ARTExplainerSpec">ARTExplainerSpec</a>, <a href="#serving.kserve.io/v1beta1.AlibiExplainerSpec">AlibiExplainerSpec</a>)
</p>
<div>
<p>ExplainerExtensionSpec defines configuration shared across all explainer frameworks</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>storageUri</code><br/>
<em>
string
</em>
</td>
<td>
<p>The location of a trained explanation model</p>
</td>
</tr>
<tr>
<td>
<code>runtimeVersion</code><br/>
<em>
string
</em>
</td>
<td>
<p>Defaults to latest Explainer Version</p>
</td>
</tr>
<tr>
<td>
<code>config</code><br/>
<em>
map[string]string
</em>
</td>
<td>
<p>Inline custom parameter settings for explainer</p>
</td>
</tr>
<tr>
<td>
<code>Container</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#container-v1-core">
Kubernetes core/v1.Container
</a>
</em>
</td>
<td>
<p>
(Members of <code>Container</code> are embedded into this type.)
</p>
<em>(Optional)</em>
<p>Container enables overrides for the predictor.
Each framework will have different defaults that are populated in the underlying container spec.</p>
</td>
</tr>
<tr>
<td>
<code>storage</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.StorageSpec">
StorageSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Storage Spec for model location</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ExplainerSpec">ExplainerSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServiceSpec">InferenceServiceSpec</a>)
</p>
<div>
<p>ExplainerSpec defines the container spec for a model explanation server,
The following fields follow a &ldquo;1-of&rdquo; semantic. Users must specify exactly one spec.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>alibi</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.AlibiExplainerSpec">
AlibiExplainerSpec
</a>
</em>
</td>
<td>
<p>Spec for alibi explainer</p>
</td>
</tr>
<tr>
<td>
<code>art</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ARTExplainerSpec">
ARTExplainerSpec
</a>
</em>
</td>
<td>
<p>Spec for ART explainer</p>
</td>
</tr>
<tr>
<td>
<code>PodSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PodSpec">
PodSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PodSpec</code> are embedded into this type.)
</p>
<p>This spec is dual purpose.
1) Users may choose to provide a full PodSpec for their custom explainer.
The field PodSpec.Containers is mutually exclusive with other explainers (i.e. Alibi).
2) Users may choose to provide a Explainer (i.e. Alibi) and specify PodSpec
overrides in the PodSpec. They must not provide PodSpec.Containers in this case.</p>
</td>
</tr>
<tr>
<td>
<code>ComponentExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ComponentExtensionSpec">
ComponentExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>ComponentExtensionSpec</code> are embedded into this type.)
</p>
<p>Component extension defines the deployment configurations for explainer</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ExplainersConfig">ExplainersConfig
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServicesConfig">InferenceServicesConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>alibi</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainerConfig">
ExplainerConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>art</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainerConfig">
ExplainerConfig
</a>
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.FailureInfo">FailureInfo
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ModelStatus">ModelStatus</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>location</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Name of component to which the failure relates (usually Pod name)</p>
</td>
</tr>
<tr>
<td>
<code>reason</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.FailureReason">
FailureReason
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>High level class of failure</p>
</td>
</tr>
<tr>
<td>
<code>message</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Detailed error message</p>
</td>
</tr>
<tr>
<td>
<code>modelRevisionName</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Internal Revision/ID of model, tied to specific Spec contents</p>
</td>
</tr>
<tr>
<td>
<code>time</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#time-v1-meta">
Kubernetes meta/v1.Time
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Time failure occurred or was discovered</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.FailureReason">FailureReason
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.FailureInfo">FailureInfo</a>)
</p>
<div>
<p>FailureReason enum</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;InvalidPredictorSpec&#34;</p></td>
<td><p>The current Predictor Spec is invalid or unsupported</p>
</td>
</tr><tr><td><p>&#34;ModelLoadFailed&#34;</p></td>
<td><p>The model failed to load within a ServingRuntime container</p>
</td>
</tr><tr><td><p>&#34;NoSupportingRuntime&#34;</p></td>
<td><p>There are no ServingRuntime which support the specified model type</p>
</td>
</tr><tr><td><p>&#34;RuntimeDisabled&#34;</p></td>
<td><p>The ServingRuntime is disabled</p>
</td>
</tr><tr><td><p>&#34;RuntimeNotRecognized&#34;</p></td>
<td><p>There is no ServingRuntime defined with the specified runtime name</p>
</td>
</tr><tr><td><p>&#34;RuntimeUnhealthy&#34;</p></td>
<td><p>Corresponding ServingRuntime containers failed to start or are unhealthy</p>
</td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.InferenceService">InferenceService
</h3>
<div>
<p>InferenceService is the Schema for the InferenceServices API</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>metadata</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#objectmeta-v1-meta">
Kubernetes meta/v1.ObjectMeta
</a>
</em>
</td>
<td>
Refer to the Kubernetes API documentation for the fields of the
<code>metadata</code> field.
</td>
</tr>
<tr>
<td>
<code>spec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.InferenceServiceSpec">
InferenceServiceSpec
</a>
</em>
</td>
<td>
<br/>
<br/>
<table>
<tr>
<td>
<code>predictor</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorSpec">
PredictorSpec
</a>
</em>
</td>
<td>
<p>Predictor defines the model serving spec</p>
</td>
</tr>
<tr>
<td>
<code>explainer</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainerSpec">
ExplainerSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Explainer defines the model explanation service spec,
explainer service calls to predictor or transformer if it is specified.</p>
</td>
</tr>
<tr>
<td>
<code>transformer</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TransformerSpec">
TransformerSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Transformer defines the pre/post processing before and after the predictor call,
transformer service calls to predictor service.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td>
<code>status</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.InferenceServiceStatus">
InferenceServiceStatus
</a>
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.InferenceServiceSpec">InferenceServiceSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceService">InferenceService</a>)
</p>
<div>
<p>InferenceServiceSpec is the top level type for this resource</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>predictor</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorSpec">
PredictorSpec
</a>
</em>
</td>
<td>
<p>Predictor defines the model serving spec</p>
</td>
</tr>
<tr>
<td>
<code>explainer</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainerSpec">
ExplainerSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Explainer defines the model explanation service spec,
explainer service calls to predictor or transformer if it is specified.</p>
</td>
</tr>
<tr>
<td>
<code>transformer</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TransformerSpec">
TransformerSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Transformer defines the pre/post processing before and after the predictor call,
transformer service calls to predictor service.</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.InferenceServiceStatus">InferenceServiceStatus
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceService">InferenceService</a>)
</p>
<div>
<p>InferenceServiceStatus defines the observed state of InferenceService</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>Status</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis/duck/v1#Status">
knative.dev/pkg/apis/duck/v1.Status
</a>
</em>
</td>
<td>
<p>
(Members of <code>Status</code> are embedded into this type.)
</p>
<p>Conditions for the InferenceService <br/>
- PredictorReady: predictor readiness condition; <br/>
- TransformerReady: transformer readiness condition; <br/>
- ExplainerReady: explainer readiness condition; <br/>
- RoutesReady: aggregated routing condition; <br/>
- Ready: aggregated condition; <br/></p>
</td>
</tr>
<tr>
<td>
<code>address</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis/duck/v1#Addressable">
knative.dev/pkg/apis/duck/v1.Addressable
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Addressable endpoint for the InferenceService</p>
</td>
</tr>
<tr>
<td>
<code>url</code><br/>
<em>
<a href="https://pkg.go.dev/knative.dev/pkg/apis#URL">
knative.dev/pkg/apis.URL
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>URL holds the url that will distribute traffic over the provided traffic targets.
It generally has the form http[s]://{route-name}.{route-namespace}.{cluster-level-suffix}</p>
</td>
</tr>
<tr>
<td>
<code>components</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ComponentStatusSpec">
map[kserve.io/v1beta1/pkg/apis/serving/v1beta1.ComponentType]kserve.io/v1beta1/pkg/apis/serving/v1beta1.ComponentStatusSpec
</a>
</em>
</td>
<td>
<p>Statuses for the components of the InferenceService</p>
</td>
</tr>
<tr>
<td>
<code>modelStatus</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelStatus">
ModelStatus
</a>
</em>
</td>
<td>
<p>Model related statuses</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.InferenceServicesConfig">InferenceServicesConfig
</h3>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>transformers</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TransformersConfig">
TransformersConfig
</a>
</em>
</td>
<td>
<p>Transformer configurations</p>
</td>
</tr>
<tr>
<td>
<code>predictors</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorsConfig">
PredictorsConfig
</a>
</em>
</td>
<td>
<p>Predictor configurations</p>
</td>
</tr>
<tr>
<td>
<code>explainers</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ExplainersConfig">
ExplainersConfig
</a>
</em>
</td>
<td>
<p>Explainer configurations</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.IngressConfig">IngressConfig
</h3>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>ingressGateway</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>ingressService</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>localGateway</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>localGatewayService</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>ingressDomain</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>ingressClassName</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>domainTemplate</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>urlScheme</code><br/>
<em>
string
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.LightGBMSpec">LightGBMSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>LightGBMSpec defines arguments for configuring LightGBMSpec model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.LoggerSpec">LoggerSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ComponentExtensionSpec">ComponentExtensionSpec</a>)
</p>
<div>
<p>LoggerSpec specifies optional payload logging available for all components</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>url</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>URL to send logging events</p>
</td>
</tr>
<tr>
<td>
<code>mode</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.LoggerType">
LoggerType
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specifies the scope of the loggers. <br />
Valid values are: <br />
- &ldquo;all&rdquo; (default): log both request and response; <br />
- &ldquo;request&rdquo;: log only request; <br />
- &ldquo;response&rdquo;: log only response <br /></p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.LoggerType">LoggerType
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.LoggerSpec">LoggerSpec</a>)
</p>
<div>
<p>LoggerType controls the scope of log publishing</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;all&#34;</p></td>
<td><p>Logger mode to log both request and response</p>
</td>
</tr><tr><td><p>&#34;request&#34;</p></td>
<td><p>Logger mode to log only request</p>
</td>
</tr><tr><td><p>&#34;response&#34;</p></td>
<td><p>Logger mode to log only response</p>
</td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ModelCopies">ModelCopies
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ModelStatus">ModelStatus</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>failedCopies</code><br/>
<em>
int
</em>
</td>
<td>
<p>How many copies of this predictor&rsquo;s models failed to load recently</p>
</td>
</tr>
<tr>
<td>
<code>totalCopies</code><br/>
<em>
int
</em>
</td>
<td>
<em>(Optional)</em>
<p>Total number copies of this predictor&rsquo;s models that are currently loaded</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ModelFormat">ModelFormat
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ModelSpec">ModelSpec</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>name</code><br/>
<em>
string
</em>
</td>
<td>
<p>Name of the model format.</p>
</td>
</tr>
<tr>
<td>
<code>version</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Version of the model format.
Used in validating that a predictor is supported by a runtime.
Can be &ldquo;major&rdquo;, &ldquo;major.minor&rdquo; or &ldquo;major.minor.patch&rdquo;.</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ModelRevisionStates">ModelRevisionStates
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ModelStatus">ModelStatus</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>activeModelState</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelState">
ModelState
</a>
</em>
</td>
<td>
<p>High level state string: Pending, Standby, Loading, Loaded, FailedToLoad</p>
</td>
</tr>
<tr>
<td>
<code>targetModelState</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelState">
ModelState
</a>
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ModelSpec">ModelSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>modelFormat</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelFormat">
ModelFormat
</a>
</em>
</td>
<td>
<p>ModelFormat being served.</p>
</td>
</tr>
<tr>
<td>
<code>runtime</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specific ClusterServingRuntime/ServingRuntime name to use for deployment.</p>
</td>
</tr>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ModelState">ModelState
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ModelRevisionStates">ModelRevisionStates</a>)
</p>
<div>
<p>ModelState enum</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;FailedToLoad&#34;</p></td>
<td><p>All copies of the model failed to load</p>
</td>
</tr><tr><td><p>&#34;Loaded&#34;</p></td>
<td><p>At least one copy of the model is loaded</p>
</td>
</tr><tr><td><p>&#34;Loading&#34;</p></td>
<td><p>Model is loading</p>
</td>
</tr><tr><td><p>&#34;Pending&#34;</p></td>
<td><p>Model is not yet registered</p>
</td>
</tr><tr><td><p>&#34;Standby&#34;</p></td>
<td><p>Model is available but not loaded (will load when used)</p>
</td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ModelStatus">ModelStatus
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServiceStatus">InferenceServiceStatus</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>transitionStatus</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TransitionStatus">
TransitionStatus
</a>
</em>
</td>
<td>
<p>Whether the available predictor endpoints reflect the current Spec or is in transition</p>
</td>
</tr>
<tr>
<td>
<code>states</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelRevisionStates">
ModelRevisionStates
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>State information of the predictor&rsquo;s model.</p>
</td>
</tr>
<tr>
<td>
<code>lastFailureInfo</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.FailureInfo">
FailureInfo
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Details of last failure, when load of target model is failed or blocked.</p>
</td>
</tr>
<tr>
<td>
<code>copies</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelCopies">
ModelCopies
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Model copy information of the predictor&rsquo;s model.</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ONNXRuntimeSpec">ONNXRuntimeSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>ONNXRuntimeSpec defines arguments for configuring ONNX model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PMMLSpec">PMMLSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>PMMLSpec defines arguments for configuring PMML model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PaddleServerSpec">PaddleServerSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PodSpec">PodSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ExplainerSpec">ExplainerSpec</a>, <a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>, <a href="#serving.kserve.io/v1beta1.TransformerSpec">TransformerSpec</a>)
</p>
<div>
<p>PodSpec is a description of a pod.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>volumes</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#volume-v1-core">
[]Kubernetes core/v1.Volume
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>List of volumes that can be mounted by containers belonging to the pod.
More info: <a href="https://kubernetes.io/docs/concepts/storage/volumes">https://kubernetes.io/docs/concepts/storage/volumes</a></p>
</td>
</tr>
<tr>
<td>
<code>initContainers</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#container-v1-core">
[]Kubernetes core/v1.Container
</a>
</em>
</td>
<td>
<p>List of initialization containers belonging to the pod.
Init containers are executed in order prior to containers being started. If any
init container fails, the pod is considered to have failed and is handled according
to its restartPolicy. The name for an init container or normal container must be
unique among all containers.
Init containers may not have Lifecycle actions, Readiness probes, Liveness probes, or Startup probes.
The resourceRequirements of an init container are taken into account during scheduling
by finding the highest request/limit for each resource type, and then using the max of
of that value or the sum of the normal containers. Limits are applied to init containers
in a similar fashion.
Init containers cannot currently be added or removed.
Cannot be updated.
More info: <a href="https://kubernetes.io/docs/concepts/workloads/pods/init-containers/">https://kubernetes.io/docs/concepts/workloads/pods/init-containers/</a></p>
</td>
</tr>
<tr>
<td>
<code>containers</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#container-v1-core">
[]Kubernetes core/v1.Container
</a>
</em>
</td>
<td>
<p>List of containers belonging to the pod.
Containers cannot currently be added or removed.
There must be at least one container in a Pod.
Cannot be updated.</p>
</td>
</tr>
<tr>
<td>
<code>ephemeralContainers</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#ephemeralcontainer-v1-core">
[]Kubernetes core/v1.EphemeralContainer
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>List of ephemeral containers run in this pod. Ephemeral containers may be run in an existing
pod to perform user-initiated actions such as debugging. This list cannot be specified when
creating a pod, and it cannot be modified by updating the pod spec. In order to add an
ephemeral container to an existing pod, use the pod&rsquo;s ephemeralcontainers subresource.
This field is alpha-level and is only honored by servers that enable the EphemeralContainers feature.</p>
</td>
</tr>
<tr>
<td>
<code>restartPolicy</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#restartpolicy-v1-core">
Kubernetes core/v1.RestartPolicy
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Restart policy for all containers within the pod.
One of Always, OnFailure, Never.
Default to Always.
More info: <a href="https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-policy">https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-policy</a></p>
</td>
</tr>
<tr>
<td>
<code>terminationGracePeriodSeconds</code><br/>
<em>
int64
</em>
</td>
<td>
<em>(Optional)</em>
<p>Optional duration in seconds the pod needs to terminate gracefully. May be decreased in delete request.
Value must be non-negative integer. The value zero indicates delete immediately.
If this value is nil, the default grace period will be used instead.
The grace period is the duration in seconds after the processes running in the pod are sent
a termination signal and the time when the processes are forcibly halted with a kill signal.
Set this value longer than the expected cleanup time for your process.
Defaults to 30 seconds.</p>
</td>
</tr>
<tr>
<td>
<code>activeDeadlineSeconds</code><br/>
<em>
int64
</em>
</td>
<td>
<em>(Optional)</em>
<p>Optional duration in seconds the pod may be active on the node relative to
StartTime before the system will actively try to mark it failed and kill associated containers.
Value must be a positive integer.</p>
</td>
</tr>
<tr>
<td>
<code>dnsPolicy</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#dnspolicy-v1-core">
Kubernetes core/v1.DNSPolicy
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Set DNS policy for the pod.
Defaults to &ldquo;ClusterFirst&rdquo;.
Valid values are &lsquo;ClusterFirstWithHostNet&rsquo;, &lsquo;ClusterFirst&rsquo;, &lsquo;Default&rsquo; or &lsquo;None&rsquo;.
DNS parameters given in DNSConfig will be merged with the policy selected with DNSPolicy.
To have DNS options set along with hostNetwork, you have to specify DNS policy
explicitly to &lsquo;ClusterFirstWithHostNet&rsquo;.</p>
</td>
</tr>
<tr>
<td>
<code>nodeSelector</code><br/>
<em>
map[string]string
</em>
</td>
<td>
<em>(Optional)</em>
<p>NodeSelector is a selector which must be true for the pod to fit on a node.
Selector which must match a node&rsquo;s labels for the pod to be scheduled on that node.
More info: <a href="https://kubernetes.io/docs/concepts/configuration/assign-pod-node/">https://kubernetes.io/docs/concepts/configuration/assign-pod-node/</a></p>
</td>
</tr>
<tr>
<td>
<code>serviceAccountName</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>ServiceAccountName is the name of the ServiceAccount to use to run this pod.
More info: <a href="https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/">https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/</a></p>
</td>
</tr>
<tr>
<td>
<code>serviceAccount</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>DeprecatedServiceAccount is a depreciated alias for ServiceAccountName.
Deprecated: Use serviceAccountName instead.</p>
</td>
</tr>
<tr>
<td>
<code>automountServiceAccountToken</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>AutomountServiceAccountToken indicates whether a service account token should be automatically mounted.</p>
</td>
</tr>
<tr>
<td>
<code>nodeName</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>NodeName is a request to schedule this pod onto a specific node. If it is non-empty,
the scheduler simply schedules this pod onto that node, assuming that it fits resource
requirements.</p>
</td>
</tr>
<tr>
<td>
<code>hostNetwork</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>Host networking requested for this pod. Use the host&rsquo;s network namespace.
If this option is set, the ports that will be used must be specified.
Default to false.</p>
</td>
</tr>
<tr>
<td>
<code>hostPID</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>Use the host&rsquo;s pid namespace.
Optional: Default to false.</p>
</td>
</tr>
<tr>
<td>
<code>hostIPC</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>Use the host&rsquo;s ipc namespace.
Optional: Default to false.</p>
</td>
</tr>
<tr>
<td>
<code>shareProcessNamespace</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>Share a single process namespace between all of the containers in a pod.
When this is set containers will be able to view and signal processes from other containers
in the same pod, and the first process in each container will not be assigned PID 1.
HostPID and ShareProcessNamespace cannot both be set.
Optional: Default to false.</p>
</td>
</tr>
<tr>
<td>
<code>securityContext</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podsecuritycontext-v1-core">
Kubernetes core/v1.PodSecurityContext
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>SecurityContext holds pod-level security attributes and common container settings.
Optional: Defaults to empty.  See type description for default values of each field.</p>
</td>
</tr>
<tr>
<td>
<code>imagePullSecrets</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#localobjectreference-v1-core">
[]Kubernetes core/v1.LocalObjectReference
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>ImagePullSecrets is an optional list of references to secrets in the same namespace to use for pulling any of the images used by this PodSpec.
If specified, these secrets will be passed to individual puller implementations for them to use. For example,
in the case of docker, only DockerConfig type secrets are honored.
More info: <a href="https://kubernetes.io/docs/concepts/containers/images#specifying-imagepullsecrets-on-a-pod">https://kubernetes.io/docs/concepts/containers/images#specifying-imagepullsecrets-on-a-pod</a></p>
</td>
</tr>
<tr>
<td>
<code>hostname</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specifies the hostname of the Pod
If not specified, the pod&rsquo;s hostname will be set to a system-defined value.</p>
</td>
</tr>
<tr>
<td>
<code>subdomain</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>If specified, the fully qualified Pod hostname will be &ldquo;<hostname>.<subdomain>.<pod namespace>.svc.<cluster domain>&rdquo;.
If not specified, the pod will not have a domainname at all.</p>
</td>
</tr>
<tr>
<td>
<code>affinity</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#affinity-v1-core">
Kubernetes core/v1.Affinity
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>If specified, the pod&rsquo;s scheduling constraints</p>
</td>
</tr>
<tr>
<td>
<code>schedulerName</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>If specified, the pod will be dispatched by specified scheduler.
If not specified, the pod will be dispatched by default scheduler.</p>
</td>
</tr>
<tr>
<td>
<code>tolerations</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#toleration-v1-core">
[]Kubernetes core/v1.Toleration
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>If specified, the pod&rsquo;s tolerations.</p>
</td>
</tr>
<tr>
<td>
<code>hostAliases</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#hostalias-v1-core">
[]Kubernetes core/v1.HostAlias
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>HostAliases is an optional list of hosts and IPs that will be injected into the pod&rsquo;s hosts
file if specified. This is only valid for non-hostNetwork pods.</p>
</td>
</tr>
<tr>
<td>
<code>priorityClassName</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>If specified, indicates the pod&rsquo;s priority. &ldquo;system-node-critical&rdquo; and
&ldquo;system-cluster-critical&rdquo; are two special keywords which indicate the
highest priorities with the former being the highest priority. Any other
name must be defined by creating a PriorityClass object with that name.
If not specified, the pod priority will be default or zero if there is no
default.</p>
</td>
</tr>
<tr>
<td>
<code>priority</code><br/>
<em>
int32
</em>
</td>
<td>
<em>(Optional)</em>
<p>The priority value. Various system components use this field to find the
priority of the pod. When Priority Admission Controller is enabled, it
prevents users from setting this field. The admission controller populates
this field from PriorityClassName.
The higher the value, the higher the priority.</p>
</td>
</tr>
<tr>
<td>
<code>dnsConfig</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#poddnsconfig-v1-core">
Kubernetes core/v1.PodDNSConfig
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Specifies the DNS parameters of a pod.
Parameters specified here will be merged to the generated DNS
configuration based on DNSPolicy.</p>
</td>
</tr>
<tr>
<td>
<code>readinessGates</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podreadinessgate-v1-core">
[]Kubernetes core/v1.PodReadinessGate
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>If specified, all readiness gates will be evaluated for pod readiness.
A pod is ready when all its containers are ready AND
all conditions specified in the readiness gates have status equal to &ldquo;True&rdquo;
More info: <a href="https://github.com/kubernetes/enhancements/tree/master/keps/sig-network/580-pod-readiness-gates">https://github.com/kubernetes/enhancements/tree/master/keps/sig-network/580-pod-readiness-gates</a></p>
</td>
</tr>
<tr>
<td>
<code>runtimeClassName</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>RuntimeClassName refers to a RuntimeClass object in the node.k8s.io group, which should be used
to run this pod.  If no RuntimeClass resource matches the named class, the pod will not be run.
If unset or empty, the &ldquo;legacy&rdquo; RuntimeClass will be used, which is an implicit class with an
empty definition that uses the default runtime handler.
More info: <a href="https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/585-runtime-class">https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/585-runtime-class</a>
This is a beta feature as of Kubernetes v1.14.</p>
</td>
</tr>
<tr>
<td>
<code>enableServiceLinks</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>EnableServiceLinks indicates whether information about services should be injected into pod&rsquo;s
environment variables, matching the syntax of Docker links.
Optional: Defaults to true.</p>
</td>
</tr>
<tr>
<td>
<code>preemptionPolicy</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#preemptionpolicy-v1-core">
Kubernetes core/v1.PreemptionPolicy
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>PreemptionPolicy is the Policy for preempting pods with lower priority.
One of Never, PreemptLowerPriority.
Defaults to PreemptLowerPriority if unset.
This field is beta-level, gated by the NonPreemptingPriority feature-gate.</p>
</td>
</tr>
<tr>
<td>
<code>overhead</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#resourcelist-v1-core">
Kubernetes core/v1.ResourceList
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Overhead represents the resource overhead associated with running a pod for a given RuntimeClass.
This field will be autopopulated at admission time by the RuntimeClass admission controller. If
the RuntimeClass admission controller is enabled, overhead must not be set in Pod create requests.
The RuntimeClass admission controller will reject Pod create requests which have the overhead already
set. If RuntimeClass is configured and selected in the PodSpec, Overhead will be set to the value
defined in the corresponding RuntimeClass, otherwise it will remain unset and treated as zero.
More info: <a href="https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/688-pod-overhead">https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/688-pod-overhead</a>
This field is alpha-level as of Kubernetes v1.16, and is only honored by servers that enable the PodOverhead feature.</p>
</td>
</tr>
<tr>
<td>
<code>topologySpreadConstraints</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#topologyspreadconstraint-v1-core">
[]Kubernetes core/v1.TopologySpreadConstraint
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>TopologySpreadConstraints describes how a group of pods ought to spread across topology
domains. Scheduler will schedule pods in a way which abides by the constraints.
All topologySpreadConstraints are ANDed.</p>
</td>
</tr>
<tr>
<td>
<code>setHostnameAsFQDN</code><br/>
<em>
bool
</em>
</td>
<td>
<em>(Optional)</em>
<p>If true the pod&rsquo;s hostname will be configured as the pod&rsquo;s FQDN, rather than the leaf name (the default).
In Linux containers, this means setting the FQDN in the hostname field of the kernel (the nodename field of struct utsname).
In Windows containers, this means setting the registry value of hostname for the registry key HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters to FQDN.
If a pod does not have FQDN, this has no effect.
Default to false.</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PredictorConfig">PredictorConfig
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorProtocols">PredictorProtocols</a>, <a href="#serving.kserve.io/v1beta1.PredictorsConfig">PredictorsConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>image</code><br/>
<em>
string
</em>
</td>
<td>
<p>predictor docker image name</p>
</td>
</tr>
<tr>
<td>
<code>defaultImageVersion</code><br/>
<em>
string
</em>
</td>
<td>
<p>default predictor docker image version on cpu</p>
</td>
</tr>
<tr>
<td>
<code>defaultGpuImageVersion</code><br/>
<em>
string
</em>
</td>
<td>
<p>default predictor docker image version on gpu</p>
</td>
</tr>
<tr>
<td>
<code>defaultTimeout,string</code><br/>
<em>
int64
</em>
</td>
<td>
<p>Default timeout of predictor for serving a request, in seconds</p>
</td>
</tr>
<tr>
<td>
<code>multiModelServer,boolean</code><br/>
<em>
bool
</em>
</td>
<td>
<p>Flag to determine if multi-model serving is supported</p>
</td>
</tr>
<tr>
<td>
<code>supportedFrameworks</code><br/>
<em>
[]string
</em>
</td>
<td>
<p>frameworks the model agent is able to run</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PredictorExtensionSpec">PredictorExtensionSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.LightGBMSpec">LightGBMSpec</a>, <a href="#serving.kserve.io/v1beta1.ModelSpec">ModelSpec</a>, <a href="#serving.kserve.io/v1beta1.ONNXRuntimeSpec">ONNXRuntimeSpec</a>, <a href="#serving.kserve.io/v1beta1.PMMLSpec">PMMLSpec</a>, <a href="#serving.kserve.io/v1beta1.PaddleServerSpec">PaddleServerSpec</a>, <a href="#serving.kserve.io/v1beta1.SKLearnSpec">SKLearnSpec</a>, <a href="#serving.kserve.io/v1beta1.TFServingSpec">TFServingSpec</a>, <a href="#serving.kserve.io/v1beta1.TorchServeSpec">TorchServeSpec</a>, <a href="#serving.kserve.io/v1beta1.TritonSpec">TritonSpec</a>, <a href="#serving.kserve.io/v1beta1.XGBoostSpec">XGBoostSpec</a>)
</p>
<div>
<p>PredictorExtensionSpec defines configuration shared across all predictor frameworks</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>storageUri</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>This field points to the location of the trained model which is mounted onto the pod.</p>
</td>
</tr>
<tr>
<td>
<code>runtimeVersion</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Runtime version of the predictor docker image</p>
</td>
</tr>
<tr>
<td>
<code>protocolVersion</code><br/>
<em>
github.com/kserve/kserve/pkg/constants.InferenceServiceProtocol
</em>
</td>
<td>
<em>(Optional)</em>
<p>Protocol version to use by the predictor (i.e. v1 or v2 or grpc-v1 or grpc-v2)</p>
</td>
</tr>
<tr>
<td>
<code>Container</code><br/>
<em>
<a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#container-v1-core">
Kubernetes core/v1.Container
</a>
</em>
</td>
<td>
<p>
(Members of <code>Container</code> are embedded into this type.)
</p>
<em>(Optional)</em>
<p>Container enables overrides for the predictor.
Each framework will have different defaults that are populated in the underlying container spec.</p>
</td>
</tr>
<tr>
<td>
<code>storage</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.StorageSpec">
StorageSpec
</a>
</em>
</td>
<td>
<em>(Optional)</em>
<p>Storage Spec for model location</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PredictorImplementation">PredictorImplementation
</h3>
<div>
<p>PredictorImplementation defines common functions for all predictors e.g Tensorflow, Triton, etc</p>
</div>
<h3 id="serving.kserve.io/v1beta1.PredictorProtocols">PredictorProtocols
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorsConfig">PredictorsConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>v1</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>v2</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServiceSpec">InferenceServiceSpec</a>)
</p>
<div>
<p>PredictorSpec defines the configuration for a predictor,
The following fields follow a &ldquo;1-of&rdquo; semantic. Users must specify exactly one spec.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>sklearn</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.SKLearnSpec">
SKLearnSpec
</a>
</em>
</td>
<td>
<p>Spec for SKLearn model server</p>
</td>
</tr>
<tr>
<td>
<code>xgboost</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.XGBoostSpec">
XGBoostSpec
</a>
</em>
</td>
<td>
<p>Spec for XGBoost model server</p>
</td>
</tr>
<tr>
<td>
<code>tensorflow</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TFServingSpec">
TFServingSpec
</a>
</em>
</td>
<td>
<p>Spec for TFServing (<a href="https://github.com/tensorflow/serving">https://github.com/tensorflow/serving</a>)</p>
</td>
</tr>
<tr>
<td>
<code>pytorch</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TorchServeSpec">
TorchServeSpec
</a>
</em>
</td>
<td>
<p>Spec for TorchServe (<a href="https://pytorch.org/serve">https://pytorch.org/serve</a>)</p>
</td>
</tr>
<tr>
<td>
<code>triton</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TritonSpec">
TritonSpec
</a>
</em>
</td>
<td>
<p>Spec for Triton Inference Server (<a href="https://github.com/triton-inference-server/server">https://github.com/triton-inference-server/server</a>)</p>
</td>
</tr>
<tr>
<td>
<code>onnx</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ONNXRuntimeSpec">
ONNXRuntimeSpec
</a>
</em>
</td>
<td>
<p>Spec for ONNX runtime (<a href="https://github.com/microsoft/onnxruntime">https://github.com/microsoft/onnxruntime</a>)</p>
</td>
</tr>
<tr>
<td>
<code>pmml</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PMMLSpec">
PMMLSpec
</a>
</em>
</td>
<td>
<p>Spec for PMML (<a href="http://dmg.org/pmml/v4-1/GeneralStructure.html">http://dmg.org/pmml/v4-1/GeneralStructure.html</a>)</p>
</td>
</tr>
<tr>
<td>
<code>lightgbm</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.LightGBMSpec">
LightGBMSpec
</a>
</em>
</td>
<td>
<p>Spec for LightGBM model server</p>
</td>
</tr>
<tr>
<td>
<code>paddle</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PaddleServerSpec">
PaddleServerSpec
</a>
</em>
</td>
<td>
<p>Spec for Paddle model server (<a href="https://github.com/PaddlePaddle/Serving">https://github.com/PaddlePaddle/Serving</a>)</p>
</td>
</tr>
<tr>
<td>
<code>model</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ModelSpec">
ModelSpec
</a>
</em>
</td>
<td>
<p>Model spec for any arbitrary framework.</p>
</td>
</tr>
<tr>
<td>
<code>PodSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PodSpec">
PodSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PodSpec</code> are embedded into this type.)
</p>
<p>This spec is dual purpose. <br />
1) Provide a full PodSpec for custom predictor.
The field PodSpec.Containers is mutually exclusive with other predictors (i.e. TFServing). <br />
2) Provide a predictor (i.e. TFServing) and specify PodSpec
overrides, you must not provide PodSpec.Containers in this case. <br /></p>
</td>
</tr>
<tr>
<td>
<code>ComponentExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ComponentExtensionSpec">
ComponentExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>ComponentExtensionSpec</code> are embedded into this type.)
</p>
<p>Component extension defines the deployment configurations for a predictor</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.PredictorsConfig">PredictorsConfig
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServicesConfig">InferenceServicesConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>tensorflow</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>triton</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>xgboost</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorProtocols">
PredictorProtocols
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>sklearn</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorProtocols">
PredictorProtocols
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>pytorch</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>onnx</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>pmml</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>lightgbm</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
<tr>
<td>
<code>paddle</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorConfig">
PredictorConfig
</a>
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.SKLearnSpec">SKLearnSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>SKLearnSpec defines arguments for configuring SKLearn model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.ScaleMetric">ScaleMetric
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ComponentExtensionSpec">ComponentExtensionSpec</a>)
</p>
<div>
<p>ScaleMetric enum</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;cpu&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;concurrency&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;memory&#34;</p></td>
<td></td>
</tr><tr><td><p>&#34;rps&#34;</p></td>
<td></td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.StorageSpec">StorageSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ExplainerExtensionSpec">ExplainerExtensionSpec</a>, <a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">PredictorExtensionSpec</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>path</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>The path to the model object in the storage. It cannot co-exist
with the storageURI.</p>
</td>
</tr>
<tr>
<td>
<code>schemaPath</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>The path to the model schema file in the storage.</p>
</td>
</tr>
<tr>
<td>
<code>parameters</code><br/>
<em>
map[string]string
</em>
</td>
<td>
<em>(Optional)</em>
<p>Parameters to override the default storage credentials and config.</p>
</td>
</tr>
<tr>
<td>
<code>key</code><br/>
<em>
string
</em>
</td>
<td>
<em>(Optional)</em>
<p>The Storage Key in the secret for this model.</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TFServingSpec">TFServingSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>TFServingSpec defines arguments for configuring Tensorflow model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TorchServeSpec">TorchServeSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>TorchServeSpec defines arguments for configuring PyTorch model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TransformerConfig">TransformerConfig
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.TransformersConfig">TransformersConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>image</code><br/>
<em>
string
</em>
</td>
<td>
<p>transformer docker image name</p>
</td>
</tr>
<tr>
<td>
<code>defaultImageVersion</code><br/>
<em>
string
</em>
</td>
<td>
<p>default transformer docker image version</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TransformerSpec">TransformerSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServiceSpec">InferenceServiceSpec</a>)
</p>
<div>
<p>TransformerSpec defines transformer service for pre/post processing</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PodSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PodSpec">
PodSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PodSpec</code> are embedded into this type.)
</p>
<p>This spec is dual purpose. <br />
1) Provide a full PodSpec for custom transformer.
The field PodSpec.Containers is mutually exclusive with other transformers. <br />
2) Provide a transformer and specify PodSpec
overrides, you must not provide PodSpec.Containers in this case. <br /></p>
</td>
</tr>
<tr>
<td>
<code>ComponentExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.ComponentExtensionSpec">
ComponentExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>ComponentExtensionSpec</code> are embedded into this type.)
</p>
<p>Component extension defines the deployment configurations for a transformer</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TransformersConfig">TransformersConfig
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.InferenceServicesConfig">InferenceServicesConfig</a>)
</p>
<div>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>feast</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.TransformerConfig">
TransformerConfig
</a>
</em>
</td>
<td>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TransitionStatus">TransitionStatus
(<code>string</code> alias)</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.ModelStatus">ModelStatus</a>)
</p>
<div>
<p>TransitionStatus enum</p>
</div>
<table>
<thead>
<tr>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr><td><p>&#34;BlockedByFailedLoad&#34;</p></td>
<td><p>Target model failed to load</p>
</td>
</tr><tr><td><p>&#34;InProgress&#34;</p></td>
<td><p>Waiting for target model to reach state of active model</p>
</td>
</tr><tr><td><p>&#34;InvalidSpec&#34;</p></td>
<td><p>Target predictor spec failed validation</p>
</td>
</tr><tr><td><p>&#34;UpToDate&#34;</p></td>
<td><p>Predictor is up-to-date (reflects current spec)</p>
</td>
</tr></tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.TritonSpec">TritonSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>TritonSpec defines arguments for configuring Triton model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<h3 id="serving.kserve.io/v1beta1.XGBoostSpec">XGBoostSpec
</h3>
<p>
(<em>Appears on:</em><a href="#serving.kserve.io/v1beta1.PredictorSpec">PredictorSpec</a>)
</p>
<div>
<p>XGBoostSpec defines arguments for configuring XGBoost model serving.</p>
</div>
<table>
<thead>
<tr>
<th>Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PredictorExtensionSpec</code><br/>
<em>
<a href="#serving.kserve.io/v1beta1.PredictorExtensionSpec">
PredictorExtensionSpec
</a>
</em>
</td>
<td>
<p>
(Members of <code>PredictorExtensionSpec</code> are embedded into this type.)
</p>
<p>Contains fields shared across all predictors</p>
</td>
</tr>
</tbody>
</table>
<hr/>
<p><em>
Generated with <code>gen-crd-api-reference-docs</code>
on git commit <code>133ecebb</code>.
</em></p>
