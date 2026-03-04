import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

export default function HomepageBenefits() {
  return (
    <section className={styles.whyKServe}>
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
                  <div className={styles.benefitCard}>
                    <h4>🧮 Optimized Backends</h4>
                    <p>Support for vLLM and llm-d for optimized performance for serving LLMs</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>📌 Standardization</h4>
                    <p>OpenAI-compatible inference protocol for seamless integration with LLMs</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>🚅 GPU Acceleration</h4>
                    <p>High-performance serving with GPU support and optimized memory management for large models</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>🗂️ KV Cache Offloading</h4>
                    <p>Advanced memory management with KV cache offloading to CPU/disk for handling longer sequences efficiently</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>📈 Autoscaling</h4>
                    <p>Request-based autoscaling capabilities optimized for generative workload patterns</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>🔧 Hugging Face Ready</h4>
                    <p>Native support for Hugging Face models with streamlined deployment workflows</p>
                  </div>
                </div>
              </div>

              <div className={styles.benefitsSection}>
                <Heading as="h3" className={styles.benefitsTitle}>
                  📊 Predictive AI
                </Heading>
                <div className={styles.benefitsGrid}>
                  <div className={styles.benefitCard}>
                    <h4>🧮 Multi-Framework</h4>
                    <p>Support for TensorFlow, PyTorch, scikit-learn, XGBoost, ONNX, and more</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>🔀 Intelligent Routing</h4>
                    <p>Seamless request routing between predictor, transformer, and explainer components with automatic traffic management</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>🔄 Advanced Deployments</h4>
                    <p>Canary rollouts, inference pipelines, and ensembles with InferenceGraph</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>⚡ Auto-scaling</h4>
                    <p>Request-based autoscaling with scale-to-zero for predictive workloads</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>💾 Model Caching</h4>
                    <p>Intelligent model caching to reduce loading times and improve response latency for frequently used models</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>🔍 Model Explainability</h4>
                    <p>Built-in support for model explanations and feature attribution to understand prediction reasoning</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>📊 Advanced Monitoring</h4>
                    <p>Enables payload logging, outlier detection, adversarial detection, and drift detection with AI Fairness 360 and ART integration</p>
                  </div>
                  <div className={styles.benefitCard}>
                    <h4>💰 Cost Efficient</h4>
                    <p>Scale-to-zero on expensive resources when not in use, reducing infrastructure costs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
