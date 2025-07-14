import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

export default function HomepageAdopters() {
  // Array of top adopters with their logos
  const adopters = [
    {
      name: 'Bloomberg',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/New_Bloomberg_Logo.svg',
      url: 'https://www.bloomberg.com/'
    },
    {
      name: 'IBM',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
      url: 'https://www.ibm.com/'
    },
    {
      name: 'Red Hat',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Logo-Red_Hat-A-Standard-RGB.png',
      url: 'https://www.redhat.com/'
    },
    {
      name: 'NVIDIA',
      logo: 'https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg',
      url: 'https://www.nvidia.com/'
    },
    {
      name: 'AMD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg',
      url: 'https://www.amd.com/'
    },
    {
      name: 'Kubeflow',
      logo: 'img/adopters/kubeflow.svg',
      url: 'https://www.kubeflow.org/'
    },
    {
      name: 'Cloudera',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Cloudera_logo.svg/1024px-Cloudera_logo.svg.png',
      url: 'https://www.cloudera.com/'
    },
    {
      name: 'Canonical',
      logo: 'https://assets.ubuntu.com/v1/2af4a08e-Canonical+dark+text.svg',
      url: 'https://canonical.com/'
    },
    {
      name: 'Cisco',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg',
      url: 'https://www.cisco.com/'
    },
    {
      name: 'Gojek',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Gojek_logo_2019.svg',
      url: 'https://www.gojek.com/'
    },
    {
      name: 'Inspur',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/73/Inspur_logo.svg/220px-Inspur_logo.svg.png',
      url: 'https://www.inspur.com/'
    },
    {
      name: 'Max Kelsen',
      logo: 'img/adopters/Max-Kelsen-logo-black.png',
      url: 'https://www.maxkelsen.com/'
    },
    {
      name: 'Prosus',
      logo: 'img/adopters/prosus.png',
      url: 'https://www.prosus.com/'
    },
    {
      name: 'Wikimedia Foundation',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Wikimedia_Foundation_logo_-_vertical.svg',
      url: 'https://wikimediafoundation.org/'
    },
    {
      name: 'Naver Corporation',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Naver_Logotype.svg',
      url: 'https://www.navercorp.com/'
    },
    {
      name: 'Zillow',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Zillow_logo.svg',
      url: 'https://www.zillow.com/'
    },
    {
      name: 'Striveworks',
      logo: 'img/adopters/striveworks.png',
      url: 'https://striveworks.us/'
    },
    {
      name: 'Cars24',
      logo: 'img/adopters/cars24.svg',
      url: 'https://www.cars24.com/'
    },
    {
      name: 'Upstage',
      logo: 'img/adopters/upstage.png',
      url: 'https://www.upstage.ai/'
    },
    {
      name: 'Intuit',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Intuit_logo_2022.svg/2880px-Intuit_logo_2022.svg.png',
      url: 'https://www.intuit.com/'
    },
    {
      name: 'Alauda',
      logo: 'img/adopters/alauda-logo.png',
      url: 'https://www.alauda.io/'
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
