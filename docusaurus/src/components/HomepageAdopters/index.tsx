import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

export default function HomepageAdopters() {
  // Array of top adopters with their logos
  const adopters = [
    {
      name: 'Kubeflow',
      logo: '/img/adopters/kubeflow.svg',
      url: 'https://www.kubeflow.org/'
    },
    {
      name: 'Alauda',
      logo: '/img/adopters/alauda-logo.png',
      url: 'https://www.alauda.io/'
    },
    {
      name: 'Cars24',
      logo: '/img/adopters/cars24.svg',
      url: 'https://www.cars24.com/'
    },
    {
      name: 'Prosus',
      logo: '/img/adopters/prosus.png',
      url: 'https://www.prosus.com/'
    },
    {
      name: 'Striveworks',
      logo: '/img/adopters/striveworks.png',
      url: 'https://striveworks.us/'
    },
    {
      name: 'Upstage',
      logo: '/img/adopters/upstage.png',
      url: 'https://www.upstage.ai/'
    },
    {
      name: 'Bloomberg',
      logo: 'https://assets.bbhub.io/media/sites/2/2021/11/Bloomberg_logo.svg',
      url: 'https://www.bloomberg.com/'
    },
    {
      name: 'IBM',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
      url: 'https://www.ibm.com/'
    }
  ];

  return (
    <section className={styles.adopters}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.adoptersTitle}>
              Trusted by Industry Leaders
            </Heading>
            
            <div className={styles.adoptersDescription}>
              <p>
                KServe is used in production by organizations across various industries,
                providing reliable model inference at scale.
              </p>
            </div>
            
            <div className={styles.adoptersGrid}>
              {adopters.map((adopter, index) => (
                <Link key={index} to={adopter.url} className={styles.adopterLink}>
                  <div className={styles.adopterCard}>
                    <img 
                      src={adopter.logo} 
                      alt={`${adopter.name} logo`} 
                      className={styles.adopterLogo}
                    />
                  </div>
                </Link>
              ))}
            </div>
            
            <div className={styles.moreAdoptersLink}>
              <Link to="/docs/community/adopters">
                View all adopters →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
