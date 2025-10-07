import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import HomepageCallToAction from '@site/src/components/HomepageCallToAction';
import HomepageShowcase from '@site/src/components/HomepageShowcase';
import HomepageArchitecture from '@site/src/components/HomepageArchitecture';
import HomepageAdopters from '@site/src/components/HomepageAdopters';
import HomepageQuickStart from '@site/src/components/HomepageQuickStart';
import HomepageBenefits from '@site/src/components/HomepageBenefits';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.logoContainer}>
          <img src="img/kserve-logo.png" alt="KServe Logo" className={styles.logo} />
        </div>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/genai-first-isvc">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg button--secondary"
            to="/docs/admin-guide/overview#installation">
            Install KServe
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
        <HomepageBenefits />
        <HomepageShowcase />
        <HomepageArchitecture />
        <HomepageQuickStart />
        <HomepageAdopters />
        <HomepageCallToAction />
      </main>
    </Layout>
  );
}
