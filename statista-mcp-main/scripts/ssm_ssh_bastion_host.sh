#!/usr/bin/env bash

# Description:
# Login to the bastion host EC2 instance via SSM
# Based on https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/access-a-bastion-host-by-using-session-manager-and-amazon-ec2-instance-connect.html
# Please read the README for general SSM setup

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <credential_profile> <region> <SSH public key file path>" >&2
  echo "Example: $0 dev eu-central-1 /home/joe/.ssh/id_ed25519.pub" >&2
  exit 1
fi

declare -r BASTION_HOST_NAME="BastionHost"

declare -r AWS_PROFILE=$1

AWS_REGION=$2
case "${AWS_REGION}" in
"euc1" | "eu-central-1")
  AWS_REGION="eu-central-1"
  declare -r AWS_REGION_SHORT="euc1"
  ;;
"use1" | "us-east-1")
  AWS_REGION="us-east-1"
  declare -r AWS_REGION_SHORT="use1"
  ;;
"apse1" | "ap-southeast-1")
  AWS_REGION="ap-southeast-1"
  declare -r AWS_REGION_SHORT="apse1"
  ;;
*)
  echo "Invalid region: ${AWS_REGION}" >&2
  exit 1
  ;;
esac

declare -r SSH_PUB_KEY_FILE=$3
if [ ! -f "$SSH_PUB_KEY_FILE" ]; then
  echo "SSH public key file does not exist: $SSH_PUB_KEY_FILE"
  exit 1
fi

declare -r INSTANCE_ID=$(aws ec2 describe-instances --profile ${AWS_PROFILE} --region ${AWS_REGION} \
  --filters "Name=tag:Name,Values=$BASTION_HOST_NAME" "Name=instance-state-name,Values=running" \
  --output text \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text)

echo "Profile: ${AWS_PROFILE}"
echo "Region: ${AWS_REGION}"
echo "Instance ID: ${INSTANCE_ID}"

echo "Copying the SSH public key $SSH_PUB_KEY_FILE to $INSTANCE_ID"
aws ec2-instance-connect send-ssh-public-key \
  --profile ${AWS_PROFILE} --region ${AWS_REGION} \
  --instance-id ${INSTANCE_ID} \
  --instance-os-user ec2-user \
  --ssh-public-key file://${SSH_PUB_KEY_FILE}

exec ssh -i $SSH_PUB_KEY_FILE \
  -o ProxyCommand="aws ssm --profile ${AWS_PROFILE} --region ${AWS_REGION} start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'" \
  ec2-user@${INSTANCE_ID}
