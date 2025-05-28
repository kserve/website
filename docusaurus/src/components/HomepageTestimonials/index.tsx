import React from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

export default function HomepageTestimonials() {
  const testimonials = [
    {
      quote: "KServe has transformed how we deploy models at scale, removing the infrastructure complexity and letting our team focus on model development.",
      author: "Machine Learning Engineer",
      company: "Fortune 500 Company"
    },
    {
      quote: "The standardized, production-grade inference API across frameworks has been a game-changer for our organization's ML deployment strategy.",
      author: "Data Science Lead",
      company: "Financial Services Organization"
    },
    {
      quote: "The ability to scale our GPU workloads to zero when not in use has dramatically reduced our infrastructure costs while maintaining high performance.",
      author: "ML Platform Engineer",
      company: "E-commerce Company"
    }
  ];

  return (
    <section className={styles.testimonials}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <Heading as="h2" className={styles.testimonialsTitle}>
              What Users Are Saying
            </Heading>
            
            <div className={styles.testimonialsGrid}>
              {testimonials.map((testimonial, index) => (
                <div className={styles.testimonialCard} key={index}>
                  <div className={styles.quoteIcon}>"</div>
                  <p className={styles.quote}>{testimonial.quote}</p>
                  <div className={styles.author}>
                    <p className={styles.authorName}>{testimonial.author}</p>
                    <p className={styles.authorCompany}>{testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
