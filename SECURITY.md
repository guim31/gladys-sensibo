# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

The integration keeps the Sensibo API key in the Gladys configuration (a secret
field) and sends it only to the Sensibo cloud (`https://home.sensibo.com`, over
HTTPS, in the `apiKey` parameter the API requires). Nothing is written to
`/data`. The logs and the error messages never contain the key nor the request
addresses that carry it. A key can be revoked at any time in the Sensibo
account.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and the Sensibo cloud, app and devices.
