import React from 'react';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import clsx from 'clsx';

export default function HomepageCallToAction() {
  return (
    <section className={styles.callToAction}>
      <div className="container">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <Heading as="h2" className={styles.ctaTitle}>
              Ready to Transform Your ML Deployment?
            </Heading>
            <p className={styles.ctaDescription}>
              Simplify your journey from model development to production with KServe's 
              standardized inference platform for both predictive and generative AI models
            </p>
            <div className={styles.ctaButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.ctaButton)}
                to="/docs/getting-started/first-isvc">
                Get Started
              </Link>
              <Link
                className={clsx('button button--secondary button--lg', styles.ctaButton)}
                to="https://github.com/kserve/kserve/tree/master/docs/samples">
                View Samples
              </Link>
              <Link
                className={clsx('button button--outline button--lg', styles.ctaButton)}
                to="https://github.com/kserve/kserve">
                GitHub Repository
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
