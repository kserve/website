import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

const features = [
  {
    title: 'Control Plane',
    description: 'Manages lifecycle of ML models, providing model revision tracking, canary rollouts, and A/B testing',
    to: '/docs/concepts/architecture/control-plane',
  },
  {
    title: 'Data Plane',
    description: 'Standardized inference protocol for model servers with request/response APIs, supporting both predictive and generative models',
    to: '/docs/concepts/architecture/data-plane',
  },
  {
    title: 'InferenceService',
    description: 'Core Kubernetes custom resource that simplifies ML model deployment with automatic scaling, networking, and health checks',
    to: '/docs/concepts/resources#inferenceservice',
  },
  {
    title: 'Inference Graph',
    description: 'Enables advanced deployments with pipelines for pre/post processing, ensembles, and multi-model workflows',
    to: '/docs/concepts/resources#inferencegraph',
  },
];

export default function HomepageArchitecture() {
  return (
    <section id="architecture" className={styles.architecture}>
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
                src="img/kserve-layer.png"
                alt="KServe Architecture"
                className={styles.archImage}
              />
            </div>

            <div className={styles.architectureFeatures}>
              {features.map((feature) => (
                <Link key={feature.title} to={feature.to} className={styles.archFeatureLink}>
                  <div className={styles.archFeature}>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
