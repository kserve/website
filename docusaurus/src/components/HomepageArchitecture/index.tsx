import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

export default function HomepageArchitecture() {
  return (
    <section className={styles.architecture}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.architectureTitle}>
              How KServe Works
            </Heading>
            
            <div className={styles.architectureDescription}>
              <p>
                KServe provides a Kubernetes custom resource definition for serving ML models on 
                arbitrary frameworks, encapsulating complexity of autoscaling, networking, health checking, 
                and server configuration to bring cutting edge serving features to your ML deployments.
              </p>
            </div>
            
            <div className={styles.architectureImage}>
              <img 
                src="/img/kserve_new.png" 
                alt="KServe Architecture" 
                className={styles.archImage}
              />
            </div>
            
            <div className={styles.architectureFeatures}>
              <div className={styles.archFeature}>
                <h3>Control Plane</h3>
                <p>Manages lifecycle of ML models, providing model revision tracking, canary rollouts, and A/B testing</p>
              </div>
              <div className={styles.archFeature}>
                <h3>Data Plane</h3>
                <p>Standardized inference protocol for model servers with request/response APIs, supporting both predictive and generative models</p>
              </div>
              <div className={styles.archFeature}>
                <h3>InferenceService</h3>
                <p>Core Kubernetes custom resource that simplifies ML model deployment with automatic scaling, networking, and health checks</p>
              </div>
              <div className={styles.archFeature}>
                <h3>Inference Graph</h3>
                <p>Enables advanced deployments with pipelines for pre/post processing, ensembles, and multi-model workflows</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
