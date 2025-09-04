#!/usr/bin/env bash

# Description:
# Connect to a service cluster via SSM and forward the local port 10443
# to the remote port 443 on the service domain.

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <credential_profile> <region>" >&2
  echo "Example: $0 dev eu-central-1" >&2
  exit 1
fi

declare -r BASTION_HOST_NAME="BastionHost"
declare -r SERVICE_PORT=443
declare -r LOCAL_PORT=10443

declare -r AWS_PROFILE=$1 # Depends on your naming in ~/.aws/config

AWS_REGION=$2

case "${AWS_REGION}" in
  "euc1" | "eu-central-1")
    AWS_REGION="eu-central-1"
    AWS_REGION_SHORT="euc1"
    ;;
  "use1" | "us-east-1")
    AWS_REGION="us-east-1"
    AWS_REGION_SHORT="use1"
    ;;
  "apse1" | "ap-southeast-1")
    AWS_REGION="ap-southeast-1"
    AWS_REGION_SHORT="apse1"
    ;;
  *)
    echo "Invalid region: ${AWS_REGION}" >&2
    exit 1
    ;;
esac

CLUSTER_ARN=$(aws ecs list-clusters --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --query 'clusterArns[?contains(@, `mcp`)]' \
    --output text )
SERVICE_ARN=$(aws ecs list-services --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --cluster ${CLUSTER_ARN} \
    --output text )
TARGETGROUP_ARN=$(aws ecs describe-services --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --cluster ${CLUSTER_ARN} \
    --service ${SERVICE_ARN} \
    --query 'services[0].loadBalancers[0].targetGroupArn' \
    --output text )
LOADBALANCER_ARN=$(aws elbv2 describe-target-groups --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --target-group-arns ${TARGETGROUP_ARN} \
    --query 'TargetGroups[0].LoadBalancerArns[0]' \
    --output text )
CERTIFICATE_ARN=$(aws elbv2 describe-listeners --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --load-balancer-arn ${LOADBALANCER_ARN} \
    --output text \
    --query 'Listeners[?Protocol == `HTTPS`].Certificates[0].CertificateArn' \
    --output text )
ENDPOINT=$(aws acm describe-certificate --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --certificate-arn ${CERTIFICATE_ARN} \
    --output text \
    --query 'Certificate.DomainName' \
    --output text )
SECRET_ARN=$(aws secretsmanager list-secrets --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --query 'SecretList[?starts_with(Name, `OPPSolutions/MCP/APIKey`)].ARN' \
    --output text)
SECRET_JSON=$(aws secretsmanager get-secret-value --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --secret-id ${SECRET_ARN} \
    --query 'SecretString' \
    --output text)
CREDENTIAL_NAME=$(echo ${SECRET_JSON} | jq '.headerFieldName')
CREDENTIAL_VALUE=$(echo ${SECRET_JSON} | jq '.headerFieldValue')

TASK_ID=$(aws ec2 describe-instances --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --filters "Name=tag:Name,Values=$BASTION_HOST_NAME" "Name=instance-state-name,Values=running" \
    --output text \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text )

echo "Profile: ${AWS_PROFILE}"
echo "Region: ${AWS_REGION}"
echo "TASK_ID: ${TASK_ID}"
echo "ENDPOINT: ${ENDPOINT}"

echo "Connect via: https://localhost:${LOCAL_PORT}/"

if [ -n "${CREDENTIAL_NAME}" ]; then
    echo -e "\nCredentials"
    echo "export CREDENTIAL_NAME=${CREDENTIAL_NAME}"
    echo "export CREDENTIAL_VALUE=${CREDENTIAL_VALUE}"
fi


exec aws ssm start-session --target ${TASK_ID} \
    --profile ${AWS_PROFILE} --region ${AWS_REGION} \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"${ENDPOINT}\"], \"portNumber\":[\"${SERVICE_PORT}\"], \"localPortNumber\":[\"${LOCAL_PORT}\"]}"
