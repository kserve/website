import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import HomepageKeyHighlights from '@site/src/components/HomepageKeyHighlights';
import HomepageCallToAction from '@site/src/components/HomepageCallToAction';
import HomepageShowcase from '@site/src/components/HomepageShowcase';
import HomepageArchitecture from '@site/src/components/HomepageArchitecture';
import HomepageGenerativeAI from '@site/src/components/HomepageGenerativeAI';
import HomepageUseCases from '@site/src/components/HomepageUseCases';
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
              <div className="col col--8 col--offset-2">
                <Heading as="h2" className={styles.sectionTitle}>
                  Why KServe?
                </Heading>
                <p className={styles.sectionDescription}>
                  KServe is a standard, cloud agnostic Model Inference Platform for serving predictive and generative AI models on Kubernetes, built for highly scalable use cases.
                  It provides performant, standardized inference protocol across ML frameworks including OpenAI specification for generative models.
                  KServe supports modern serverless inference workloads with request-based autoscaling including scale-to-zero on both CPU and GPU resources.
                </p>
              </div>
            </div>
          </div>
        </div>
        <HomepageKeyHighlights />
        <HomepageShowcase />
        <HomepageGenerativeAI />
        <HomepageArchitecture />
        <HomepageFeatures />
        <HomepageQuickStart />
        <HomepageUseCases />
        <HomepageAdopters />
        <HomepageCallToAction />
      </main>
    </Layout>
  );
}
