import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import HomepageCallToAction from '@site/src/components/HomepageCallToAction';
import HomepageShowcase from '@site/src/components/HomepageShowcase';
import HomepageArchitecture from '@site/src/components/HomepageArchitecture';
import HomepageGenerativeAI from '@site/src/components/HomepageGenerativeAI';
import HomepageAdopters from '@site/src/components/HomepageAdopters';
import HomepageQuickStart from '@site/src/components/HomepageQuickStart';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.logoContainer}>
          <img src="/img/kserve-logo.png" alt="KServe Logo" className={styles.logo} />
        </div>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/get_started/first_isvc">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg button--secondary"
            to="https://github.com/kserve/kserve">
            GitHub Repository
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="KServe - A Kubernetes-native platform for serving machine learning models with standardized protocols for both predictive and generative AI. Scale to zero, GPU acceleration, and multi-framework support.">
      <HomepageHeader />
      <main>
        <div className={styles.whyKServe}>
          <div className="container">
            <div className="row">
              <div className="col col--10 col--offset-1">
                <Heading as="h2" className={styles.sectionTitle}>
                  Why KServe?
                </Heading>
                <p className={styles.sectionDescription}>
                  KServe is a standard, cloud agnostic Model Inference Platform for serving predictive and generative AI models on Kubernetes, built for highly scalable use cases.
                  It provides performant, standardized inference protocol across ML frameworks including OpenAI specification for generative models.
                  KServe supports modern serverless inference workloads with request-based autoscaling including scale-to-zero on both CPU and GPU resources.
                </p>
                
                <div className={styles.benefitsContainer}>
                  <div className={styles.benefitsSection}>
                    <Heading as="h3" className={styles.benefitsTitle}>
                      🤖 For Generative AI
                    </Heading>
                    <div className={styles.benefitsGrid}>
                      <div className={styles.benefitCard}>
                        <h4>🧠 LLM-Optimized</h4>
                        <p>OpenAI-compatible inference protocol for seamless integration with large language models</p>
                      </div>
                      <div className={styles.benefitCard}>
                        <h4>🚅 GPU Acceleration</h4>
                        <p>High-performance serving with GPU support and optimized memory management for large models</p>
                      </div>
                      <div className={styles.benefitCard}>
                        <h4>💰 Cost Efficient</h4>
                        <p>Scale-to-zero on expensive GPU resources when not in use, reducing infrastructure costs</p>
                      </div>
                      <div className={styles.benefitCard}>
                        <h4>🔧 Hugging Face Ready</h4>
                        <p>Native support for Hugging Face models with streamlined deployment workflows</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.benefitsSection}>
                    <Heading as="h3" className={styles.benefitsTitle}>
                      📊 For Predictive AI
                    </Heading>
                    <div className={styles.benefitsGrid}>
                      <div className={styles.benefitCard}>
                        <h4>🧮 Multi-Framework</h4>
                        <p>Support for TensorFlow, PyTorch, scikit-learn, XGBoost, ONNX, and more</p>
                      </div>
                      <div className={styles.benefitCard}>
                        <h4>📊 ModelMesh Integration</h4>
                        <p>High scalability, density packing, and intelligent routing for efficient model serving</p>
                      </div>
                      <div className={styles.benefitCard}>
                        <h4>🔄 Advanced Deployments</h4>
                        <p>Canary rollouts, inference pipelines, and ensembles with InferenceGraph</p>
                      </div>
                      <div className={styles.benefitCard}>
                        <h4>⚡ Auto-scaling</h4>
                        <p>Request-based autoscaling with intelligent resource allocation for predictive workloads</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <HomepageShowcase />
        <HomepageGenerativeAI />
        <HomepageArchitecture />
        <HomepageFeatures />
        <HomepageQuickStart />
        <HomepageAdopters />
        <HomepageCallToAction />
      </main>
    </Layout>
  );
}
