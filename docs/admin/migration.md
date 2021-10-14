# Migrating from KFServing

This doc helps to migrate existing inference services running in the cluster from `KFServing` to `KServe` without downtime. The script deletes your `KFServing` installation after migrating the inference services from `serving.kubeflow.org` to `serving.kserve.io`.


!!! note
    The migration job runs in kserve namespace. please make sure kserve running in the cluster.


### Migration

Please use this [YAML file](./kserve_migration_job.yaml) to migrate existing inference services.

=== "kubectl"
```bash
kubectl apply -f kserve_migration_job.yaml
```
