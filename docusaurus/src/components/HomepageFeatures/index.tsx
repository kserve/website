import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Predictive & Generative Models',
    icon: '🤖',
    description: (
      <>
        Provides serverless deployment for both predictive and generative AI models on CPU/GPU
        with support for TensorFlow, PyTorch, Huggingface Transformers/LLMs, scikit-learn, XGBoost,
        and pluggable custom model runtimes.
      </>
    ),
  },
  {
    title: 'ModelMesh Integration',
    icon: '🧩',
    description: (
      <>
        Designed for high-scale, high-density and frequently-changing model use cases. 
        ModelMesh intelligently loads and unloads AI models to strike a balance between 
        responsiveness and computational efficiency.
      </>
    ),
  },
  {
    title: 'Model Explainability',
    icon: '🔍',
    description: (
      <>
        Provides ML model inspection and interpretation capabilities. KServe enables a simple, 
        pluggable, and complete story for production ML serving including prediction, 
        pre-processing, post-processing and explainability.
      </>
    ),
  },
  {
    title: 'Advanced Monitoring',
    icon: '📊',
    description: (
      <>
        Enables payload logging, outlier detection, adversarial detection, and drift detection. 
        KServe integrates AI Fairness 360 and Adversarial Robustness Toolbox (ART) to help
        monitor ML models in production.
      </>
    ),
  },
  {
    title: 'InferenceGraph',
    icon: '🌐',
    description: (
      <>
        Advanced deployments with canary rollout, A/B testing, and pipelines. KServe inference graph 
        supports four types of routing nodes: Sequence, Switch, Ensemble, and Splitter for 
        sophisticated model deployment scenarios.
      </>
    ),
  },
  {
    title: 'Cloud Agnostic & Standards Based',
    icon: '☁️',
    description: (
      <>
        Provides performant, standardized inference protocol across ML frameworks including OpenAI
        specification for generative models, with support for modern serverless inference workloads
        with autoscaling.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
