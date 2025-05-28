import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

export default function HomepageGenerativeAI() {
  return (
    <section className={styles.generativeAI}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.generativeTitle}>
              Generative AI Ready
            </Heading>
            
            <div className={styles.generativeDescription}>
              <p>
                KServe provides standardized interfaces for serving Large Language Models 
                and other generative AI models with OpenAI-compatible inference protocols.
              </p>
            </div>
            
            <div className={styles.generativeContent}>
              <div className={styles.generativeImage}>
                <img 
                  src="/img/kserve_generative_inference.png" 
                  alt="KServe Generative AI Inference" 
                  className={styles.genImage}
                />
              </div>
              
              <div className={styles.generativeFeatures}>
                <div className={styles.genFeature}>
                  <h3>OpenAI Compatible API</h3>
                  <p>Standardized interface for interacting with LLMs and other generative models</p>
                </div>
                <div className={styles.genFeature}>
                  <h3>Huggingface Integration</h3>
                  <p>Seamless deployment of Huggingface Transformer models and LLMs</p>
                </div>
                <div className={styles.genFeature}>
                  <h3>GPU Acceleration</h3>
                  <p>Efficient GPU utilization with request-based autoscaling for cost optimization</p>
                </div>
                <div className={styles.genFeature}>
                  <h3>Request Batching</h3>
                  <p>Automatic batching of inference requests for higher throughput</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
