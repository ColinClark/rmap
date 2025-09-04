# Access to services on AWS

The service is running in a private VPC subnet and the account has no internet gateway, which prevents direct
service access from local machine. This is intentional and recommended security best practice.

It is possible to setup a tunnel via the AWS SSM service to reach the service from a local machine.

Two scripts are provided

- ssm_service_portforward.sh: a tunnel to the MCP server on port 10443
- ssm_ssh_bastion_host.sh: opens a SSH session on the bastion host

To enable the access, the bastion host must bedeployed to the account by enabling it in the environment.
See the `bastionHostEnabled` property in cdk/lib/config.ts.

## Setup

Prerequisites:

- [AWS cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [AWS cli Session Manger plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

To setup profiles for the different AWS accounts, use `aws configure sso`.
The examples assume the existence of an `dev` profile for the DEV environment.

### Service access from local machine

To establish a network link to the service, the provided script `scripts/ssm_service_portforward.sh` will do the heavy lifting.
When run without parameters, it will explain its usage.

You can use the following commands to tunnel in the dev account:

```
./ssm_service_portforward.sh dev eu-central-1
```

When executed it will look like this

```bash
$ ./ssm_service_portforward.sh dev eu-central-1
Profile: os-dev
Region: eu-central-1
TASK_ID: i-0466e534b25eeed666
ENDPOINT: euc1.mcp.opp-solutions.dev.aws.statista.com
Connect via: https://localhost:10443/

Credentials
export CREDENTIAL_NAME="X-MCP-API-Key"
export CREDENTIAL_VALUE="RANDOM_NOISE"

Starting session with SessionId: user@statista.com-o2c7qhoui9tbxnszfbtgpibi4y
Port 10443 opened for sessionId user@statista.com-o2c7qhoui9tbxnszfbtgpibi4y.
Waiting for connections...
```

It will provide the access key in its output, which needs to be send with the HTTP requests.

The tunnel is then ready to except connections. Accessing it with curl looks like this.
Using the provided credentials.

```bash
$ export CREDENTIAL_NAME="X-MCP-API-Key"
$ export CREDENTIAL_VALUE="RANDOM_NOISE"
$ curl -k -H "$CREDENTIAL_NAME: $CREDENTIAL_VALUE" https://localhost:10443/health | json_pp
{
   "activeSessions" : 0,
   "server" : "statista-mcp-server",
   "status" : "ok",
   "timestamp" : "2025-07-31T13:17:22.111Z"
}
```

### SSH access to the bastion host via SSM

To log into the bastion host via SSH, use the `scripts/sm_ssh_bastion_host.sh` script.
When run without parameters, it will explain its usage.

Example usage:

```
$ ./ssm_ssh_bastion_host.sh dev eu-central-1 /home/joe/.ssh/id_ed25519.pub
   ,     #_
   ~\_  ####_        Amazon Linux 2023
  ~~  \_#####\
  ~~     \###|
  ~~       \#/ ___   https://aws.amazon.com/linux/amazon-linux-2023
   ~~       V~' '->
    ~~~         /
      ~~._.   _/
         _/ _/
       _/m/'
[ec2-user@ip-10-135-35-72 ~]$
```
