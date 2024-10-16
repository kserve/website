const kserveComponents = [
    {
      title: 'Model Serving',
      subtitle: 'Provides Serverless deployment for model inference on CPU/GPU with common ML frameworks Scikit-Learn, XGBoost, Tensorflow, PyTorch as well as pluggable custom model runtime.',
      imageUrl: '/img/KserveComponents/Model Serving.svg',
      link: '/model-serving', // Replace with the actual link
    },
    {
      title: 'ModelMesh Serving',
      subtitle: 'ModelMesh is designed for high-scale, high-density, and frequently-changing model use cases. ModelMesh intelligently loads and unloads AI models to and from memory to strike an intelligent trade-off between responsiveness to users and computational footprint.',
      imageUrl: '/img/KserveComponents/ModelMesh-Serving.png',
      link: '/modelmesh-serving', // Replace with the actual link
    },
    {
      title: 'Model Explainability',
      subtitle: 'Provides ML model inspection and interpretation, KServe integrates Alibi, AI Explainability 360, Captum to help explain the predictions and gauge the confidence of those predictions.',
      imageUrl: '/img/KserveComponents/Explaination.png',
      link: '/model-explainability', // Replace with the actual link
    },
    {
      title: 'Model Monitoring',
      subtitle: 'Enables payload logging, outlier, adversarial and drift detection, KServe integrates Alibi-detect, AI Fairness 360, Adversarial Robustness Toolbox (ART) to help monitor the ML models on production.',
      imageUrl: '/img/KserveComponents/Monitoring.svg',
      link: '/model-monitoring', // Replace with the actual link
    },
    {
      title: 'Advanced Deployments',
      subtitle: 'KServe inference graph supports four types of routing node: Sequence, Switch, Ensemble, Splitter.',
      imageUrl: '/img/KserveComponents/Advanced deployments.png',
      link: '/advanced-deployments', // Replace with the actual link
    },
  ];
  export default function KserveComponents(): JSX.Element {
    return (
      <div className="bg-gradient-to-b from-gray-100 to-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">KServe Components</h2>
          </div>
          <ul
            role="list"
            className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3"
          >
            {kserveComponents.map((component, index) => (
              <li key={index} className="bg-white rounded-lg overflow-hidden shadow-md transition-transform transform hover:scale-105">
                <a href={component.link} className="block group">
                  <div className="aspect-[3/2]">
                    <img className="w-full h-full object-cover" src={component.imageUrl} alt="" />
                  </div>
                  <div className="p-6">
                    <h3 className="mt-2 text-xl font-semibold leading-7 text-gray-900 group-hover:text-indigo-500">
                      {component.title}
                    </h3>
                    <p className="mt-3 text-base leading-6 text-gray-600">{component.subtitle}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  