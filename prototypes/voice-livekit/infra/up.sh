#!/usr/bin/env bash
# PROTOTYPE, throwaway. Part of https://github.com/shrujancheruku/look-together/issues/31.
# One VM in us-central1 running self-hosted LiveKit, the voice worker and the turn API, behind Caddy at <ip>.sslip.io.
# Tear down with infra/down.sh. Always project look-together.
set -euo pipefail
P=look-together Z=us-central1-a R=us-central1 VM=proto-voice SA=proto-voice@look-together.iam.gserviceaccount.com
cd "$(dirname "$0")/.."

gcloud services enable compute.googleapis.com aiplatform.googleapis.com speech.googleapis.com texttospeech.googleapis.com --project $P
gcloud iam service-accounts describe $SA --project $P >/dev/null 2>&1 || gcloud iam service-accounts create proto-voice --display-name "PROTOTYPE voice worker" --project $P
for role in roles/aiplatform.user roles/speech.client roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $P --member serviceAccount:$SA --role $role --condition None >/dev/null
done
gcloud compute addresses describe $VM --region $R --project $P >/dev/null 2>&1 || gcloud compute addresses create $VM --region $R --project $P
IP=$(gcloud compute addresses describe $VM --region $R --project $P --format 'value(address)')
gcloud compute firewall-rules describe $VM --project $P >/dev/null 2>&1 || gcloud compute firewall-rules create $VM --project $P \
  --target-tags $VM --allow tcp:80,tcp:443,tcp:7881,udp:3478,udp:50000-60000
gcloud compute instances describe $VM --zone $Z --project $P >/dev/null 2>&1 || gcloud compute instances create $VM --project $P --zone $Z \
  --machine-type e2-standard-4 --image-family debian-12 --image-project debian-cloud --boot-disk-size 20GB \
  --address $IP --tags $VM --service-account $SA --scopes cloud-platform

until gcloud compute ssh $VM --zone $Z --project $P --command true 2>/dev/null; do sleep 5; done
tar czf - --exclude node_modules --exclude app --exclude '*.wav' -C .. voice-dialogue/system-prompt.md voice-livekit \
  | gcloud compute ssh $VM --zone $Z --project $P --command 'mkdir -p ~/p && tar xzf - -C ~/p'
gcloud compute ssh $VM --zone $Z --project $P --command "bash ~/p/voice-livekit/infra/vm-setup.sh $IP"
echo "PROTOTYPE up: https://${IP//./-}.sslip.io"
