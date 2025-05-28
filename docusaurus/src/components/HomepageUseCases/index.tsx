import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

export default function HomepageUseCases() {
  return (
    <section className={styles.useCases}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.useCasesTitle}>
              Real-World Use Cases
            </Heading>
            
            <div className={styles.useCasesDescription}>
              <p>
                KServe is being used across various organizations to solve real-world machine learning deployment challenges.
              </p>
            </div>
            
            <div className={styles.useCaseCards}>
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🏛️</div>
                <h3>Financial Services</h3>
                <p>
                  Deploying fraud detection models with GPU acceleration and canary rollouts 
                  for risk mitigation in financial transactions.
                </p>
              </div>
              
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🏥</div>
                <h3>Healthcare</h3>
                <p>
                  Serving medical imaging classification models with explainability components
                  to aid in diagnostic processes and regulatory compliance.
                </p>
              </div>
              
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🛒</div>
                <h3>E-commerce</h3>
                <p>
                  Recommendation systems using ensemble models and A/B testing through InferenceGraph
                  to optimize customer experience and conversion rates.
                </p>
              </div>
              
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🤖</div>
                <h3>Conversational AI</h3>
                <p>
                  Deploying LLMs with request batching and GPU sharing for efficient 
                  resource utilization in chat applications.
                </p>
              </div>
              
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🔍</div>
                <h3>Content Moderation</h3>
                <p>
                  Multi-model pipelines with pre/post processing for scalable content 
                  filtering and policy enforcement.
                </p>
              </div>
              
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>📊</div>
                <h3>Analytics</h3>
                <p>
                  High-throughput prediction services with monitoring for business 
                  intelligence and data-driven decision making.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
