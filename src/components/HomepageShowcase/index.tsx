import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

export default function HomepageShowcase() {
  return (
    <section className={styles.showcase}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.showcaseTitle}>
              Simple and Powerful API
            </Heading>
            
            <div className={styles.showcaseContent}>
              <div className={styles.showcaseText}>
                <p>
                  KServe provides a Kubernetes Custom Resource Definition for serving predictive and generative 
                  machine learning models. It encapsulates the complexity of autoscaling, networking, health checking, 
                  and server configuration to bring cutting edge serving features to your ML deployments.
                </p>
                <div className={styles.showcasePoints}>
                  <div className={styles.showcasePoint}>
                    <span className={styles.pointIcon}>✓</span>
                    <span>Standard K8s API across ML frameworks</span>
                  </div>
                  <div className={styles.showcasePoint}>
                    <span className={styles.pointIcon}>✓</span>
                    <span>Pre/post processing and explainability</span>
                  </div>
                  <div className={styles.showcasePoint}>
                    <span className={styles.pointIcon}>✓</span>
                    <span>OpenAI specification support for LLMs</span>
                  </div>
                  <div className={styles.showcasePoint}>
                    <span className={styles.pointIcon}>✓</span>
                    <span>Canary rollouts and A/B testing</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.showcaseCode}>
                <CodeBlock language="yaml">
                  {`apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "llm-service"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      resources:
        limits:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
      storageUri: "hf://meta-llama/Llama-3.1-8B-Instruct"`}
                </CodeBlock>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
