import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

export default function HomepageKeyHighlights() {
  return (
    <section className={styles.highlights}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.highlightsTitle}>
              Key Benefits
            </Heading>
            <div className={styles.highlightsGrid}>
              <div className={styles.highlightCard}>
                <h3>🚅 High Performance</h3>
                <p>Optimized inference serving with support for hardware acceleration on both CPU and GPU</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>💰 Cost Efficiency</h3>
                <p>Request-based autoscaling with scale-to-zero capability for both CPU and GPU workloads</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>🧠 Multi-Framework</h3>
                <p>Support for TensorFlow, PyTorch, Huggingface, scikit-learn, XGBoost and more</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>🤖 Generative AI Ready</h3>
                <p>OpenAI-compatible inference protocol for LLMs and generative models</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>📊 ModelMesh Integration</h3>
                <p>High scalability, density packing, and intelligent routing for efficient model serving</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>🔄 Advanced Deployments</h3>
                <p>Canary rollouts, inference pipelines, and ensembles with InferenceGraph</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
