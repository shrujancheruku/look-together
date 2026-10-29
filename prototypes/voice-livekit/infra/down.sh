#!/usr/bin/env bash
# PROTOTYPE, throwaway. Deletes everything infra/up.sh made.
set -euo pipefail
P=look-together Z=us-central1-a R=us-central1 VM=proto-voice
gcloud compute instances delete $VM --zone $Z --project $P --quiet || true
gcloud compute addresses delete $VM --region $R --project $P --quiet || true
gcloud compute firewall-rules delete $VM --project $P --quiet || true
for role in roles/aiplatform.user roles/speech.client roles/serviceusage.serviceUsageConsumer; do
  gcloud projects remove-iam-policy-binding $P --member serviceAccount:proto-voice@$P.iam.gserviceaccount.com --role $role --condition None >/dev/null || true
done
gcloud iam service-accounts delete proto-voice@$P.iam.gserviceaccount.com --project $P --quiet || true
