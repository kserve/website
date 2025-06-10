import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';

export default function HomepageQuickStart() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.quickStartTitle}>
              Quick Start
            </Heading>
            
            <div className={styles.quickStartDescription}>
              <p>
                Get started with KServe in minutes. Follow these simple steps to deploy your first model.
              </p>
            </div>
            
            <div className={styles.quickStartSteps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h3>Install KServe</h3>
                  <p>Install KServe and its dependencies on your Kubernetes cluster:</p>
                  <CodeBlock language="bash">
                    {`kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.11.0/kserve.yaml`}
                  </CodeBlock>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h3>Create an InferenceService</h3>
                  <p>Deploy a pre-trained model with a simple YAML configuration:</p>
                  <CodeBlock language="yaml">
                    {`apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "llama3-8b-instruct"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      resources:
        requests:
          cpu: "6"
          memory: 24Gi
          nvidia.com/gpu: "1"
      storageUri: "hf://meta-llama/Llama-3.1-8B-Instruct"`}
                  </CodeBlock>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h3>Send Inference Requests</h3>
                  <p>Make predictions using the deployed model:</p>
                  <CodeBlock language="bash">
                    {`curl -v -H "Host: llama3-8b-instruct.default.example.com" \\
  http://localhost:8080/openai/v1/chat/completions -d @./prompt.json`}
                  </CodeBlock>
                </div>
              </div>
            </div>
            
            <div className={styles.quickStartCTA}>
              <Link
                className="button button--primary button--lg"
                to="/docs/getting-started/first-isvc">
                Detailed Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
