import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

const genAIFeatures = [
  {
    icon: '🧮',
    title: 'Optimized Backends',
    desc: 'vLLM and llm-d for high-performance LLM serving',
    link: '/docs/model-serving/generative-inference/llmisvc/llmisvc-overview',
  },
  {
    icon: '📌',
    title: 'OpenAI Compatible',
    desc: 'Drop-in OpenAI protocol for seamless LLM integration',
    link: '/docs/model-serving/generative-inference/llmisvc/llmisvc-overview',
  },
  {
    icon: '🚅',
    title: 'GPU Acceleration',
    desc: 'High-performance serving with optimized GPU memory management',
    link: '/docs/model-serving/generative-inference/multi-node/multi-node',
  },
  {
    icon: '💾',
    title: 'Model Caching',
    desc: 'Reduce load times and improve latency for frequently used models',
    link: '/docs/install/localmodel-install',
  },
  {
    icon: '🗂️',
    title: 'KV Cache Offloading',
    desc: 'Offload KV cache to CPU/disk for longer sequence handling',
    link: '/docs/model-serving/generative-inference/llmisvc/llmisvc-configuration',
  },
  {
    icon: '📈',
    title: 'Autoscaling',
    desc: 'Request-based autoscaling tuned for generative workloads',
    link: '/docs/model-serving/generative-inference/autoscaling/autoscaling',
  },
  {
    icon: '🔧',
    title: 'Hugging Face Ready',
    desc: 'Native HuggingFace model support with streamlined deployment',
    link: '/docs/getting-started/genai-first-isvc',
  },
];

const predictiveFeatures = [
  {
    icon: '🧮',
    title: 'Multi-Framework',
    desc: 'TensorFlow, PyTorch, scikit-learn, XGBoost, ONNX, and more',
    link: '/docs/model-serving/predictive-inference/frameworks/overview',
  },
  {
    icon: '🔀',
    title: 'Intelligent Routing',
    desc: 'Seamless routing between predictor, transformer, and explainer',
    link: '/docs/model-serving/predictive-inference/transformers/custom-transformer/custom-transformer',
  },
  {
    icon: '🔄',
    title: 'Advanced Deployments',
    desc: 'Canary rollouts, pipelines, and ensembles with InferenceGraph',
    link: '/docs/model-serving/inferencegraph/overview',
  },
  {
    icon: '⚡',
    title: 'Auto-scaling',
    desc: 'Scale-to-zero for predictive workloads on any autoscaler',
    link: '/docs/model-serving/predictive-inference/autoscaling/kpa-autoscaler',
  },
  {
    icon: '🔍',
    title: 'Model Explainability',
    desc: 'Built-in feature attribution to understand prediction reasoning',
    link: '/docs/model-serving/predictive-inference/explainers/overview',
  },
  {
    icon: '📊',
    title: 'Advanced Monitoring',
    desc: 'Payload logging, outlier, adversarial, and drift detection',
    link: '/docs/model-serving/predictive-inference/observability/prometheus-metrics',
  },
  {
    icon: '💰',
    title: 'Cost Efficient',
    desc: 'Scale-to-zero on expensive resources when not in use',
    link: '/docs/admin-guide/serverless/serverless',
  },
];

function FeatureCard({ icon, title, desc, link }) {
  return (
    <Link to={link} className={styles.benefitCardLink}>
      <div className={styles.benefitCard}>
        <h4><span className={styles.cardIcon}>{icon}</span>{title}</h4>
        <p>{desc}</p>
      </div>
    </Link>
  );
}

export default function HomepageBenefits() {
  return (
    <section id="why-kserve" className={styles.whyKServe}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.sectionTitle}>
              Why KServe?
            </Heading>
            <p className={styles.sectionDescription}>
              The open-source standard for self-hosted AI, providing a unified platform for both Generative and Predictive AI inference on Kubernetes.
              <span className={styles.sectionTagline}>
                Simple enough for quick deployments, yet powerful enough for the most demanding enterprise workloads.
              </span>
            </p>
            <div className={styles.benefitsContainer}>
              <div className={styles.benefitsSection}>
                <Heading as="h3" className={styles.benefitsTitle}>
                  🤖 Generative AI
                </Heading>
                <div className={styles.benefitsGrid}>
                  {genAIFeatures.map((f) => (
                    <FeatureCard key={f.title} {...f} />
                  ))}
                </div>
              </div>
              <div className={styles.benefitsSection}>
                <Heading as="h3" className={styles.benefitsTitle}>
                  📊 Predictive AI
                </Heading>
                <div className={styles.benefitsGrid}>
                  {predictiveFeatures.map((f) => (
                    <FeatureCard key={f.title} {...f} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
