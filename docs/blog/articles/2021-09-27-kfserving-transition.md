---
title: "KServe: The next generation of KFServing"
date: 2020-09-27
description: "KServe Blog Post"
type: "blog"
---

#### By **Dan Sun(dsun20@bloomberg.net)** and **Animesh Singh(singhan@us.ibm.com)** on behalf of the Kubeflow Serving Working Group

### **KFServing is now KServe**
We are excited to announce the next chapter for KFServing.
In coordination with the Kubeflow Project Steering Group, the [<u>KFServing GitHub repository</u>](https://github.com/kubeflow/kfserving) has now been
transferred to an independent [<u>KServe GitHub organization</u>](https://github.com/kserve/kserve) under the stewardship of the Kubeflow Serving Working
Group leads. 

The project has been rebranded from **KFServing** to **KServe**, and we are planning to graduate the project from Kubeflow Project later this year.

<img src="../images/2021-09-27-kfserving-transition/image1.png" style="width:6.5in;height:4in" />

Developed collaboratively by Google, IBM, Bloomberg, NVIDIA, and Seldon in 2019, KFServing was published as open source in early 2019. 
The project sets out to provide the following features:
- A simple, yet powerful, Kubernetes Custom Resource for deploying machine learning (ML) models on production across ML frameworks.
- Provide performant, standardized inference protocol.
- Serverless inference according to live traffic patterns, supporting “Scale-to-zero” on both CPUs and GPUs.
- Complete story for production ML Model Serving including prediction, pre/post-processing, explainability, and monitoring.
- Support for deploying thousands of models at scale and inference graph capability for multiple models.

KFServing was created to address the challenges of deploying and monitoring machine learning models on production for organizations.
After publishing the open source project, we’ve seen an explosion in demand for the software, leading to strong adoption and community growth.
The scope of the project has since increaded, and we have developed multiple components along the way, including our own growing body of documentation
that needs it's own website and independent GitHub organization.

### **What's Next**

Over the coming weeks, we will be releasing **KServe 0.7** outside of the Kubeflow Project and will provide more details on how to migrate from KFServing to
KServe with minimal disruptions. KFServing 0.5.x/0.6.x releases are still supported in next six months after KServe 0.7 release. We are also working on
integrating core Kubeflow APIs and standards for [the conformance program](https://docs.google.com/document/d/1a9ufoe_6DB1eSjpE9eK5nRBoH3ItoSkbPfxRA0AjPIc). 

For contributors, please follow the KServe [developer](https://github.com/kserve/website/blob/main/docs/developer/developer.md) and 
[doc contribution](https://github.com/kserve/website/blob/main/docs/help/contributor/mkdocs-contributor-guide.md) guide to make code or doc contributions.
We are excited to work with you to make KServe better and promote its adoption by more and more users!

<img src="../images/2021-09-27-kfserving-transition/kserve.png" style="width:8in;height:4in" />

### **KServe Key Links**
- [<u>Website</u>](https://kserve.github.io/website/)
- [<u>Github</u>](https://github.com/kserve/kserve/)
- [<u>Slack(#kubeflow-kfserving)</u>](https://kubeflow.slack.com/join/shared_invite/zt-n73pfj05-l206djXlXk5qdQKs4o1Zkg#/) 

### **Contributor Acknowledgement**

We'd like to thank all the KServe contributors for this transition work!

-   [Andrews Arokiam](https://github.com/andyi2it)

-   [Animesh Singh](https://github.com/animeshsingh)

-   [Chin Huang](https://github.com/chinhuang007)

-   [Dan Sun](http://github.com/yuzisun)

-   [Jagadeesh](https://github.com/jagadeeshi2i)

-   [Jinchi He](https://github.com/jinchihe)

-   [Nick Hill](https://github.com/njhill)

-   [Paul Van Eck](https://github.com/pvaneck)

-   [Qianshan Chen](https://github.com/Iamlovingit)

-   [Suresh Nakkiran](https://github.com/Suresh-Nakkeran)

-   [Sukumar Gaonkar](https://github.com/sukumargaonkar)

-   [Theofilos Papapanagiotou](https://github.com/theofpa)

-   [Tommy Li](https://github.com/Tomcli)

-   [Vedant Padwal](https://github.com/js-ts)

-   [Yao Xiao](https://github.com/PatrickXYS)

-   [Yuzhui Liu](https://github.com/yuzliu)
