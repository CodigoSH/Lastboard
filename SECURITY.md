# Security Policy & Infrastructure Transparency

## Secure Update Delivery
**Lastboard** is committed to both transparency and user security. To provide a reliable update experience, we utilize a dedicated middleware infrastructure.

### The Update Proxy (`api-updates.codigosh.com`)
Our web installer communicates with a private proxy server hosted on **Oracle Cloud (OCI)**. This proxy acts as a secure bridge between your installation and the GitHub API.

#### Why is this repository private?
While **Lastboard** is open-source, the `lastboard-updater-proxy` repository is kept private for the following security reasons:

* **Credential Protection:** The proxy manages a high-limit GitHub Personal Access Token (PAT). Keeping the repo private prevents token theft and unauthorized access to our organization's resources.
* **Infrastructure Integrity:** It prevents "Resource Exhaustion" or DDoS attacks by hiding the internal logic of our deployment on Oracle Cloud.
* **Abuse Prevention:** It ensures that our server resources are used exclusively to serve **Lastboard** users and not hijacked by third parties.



### Transparency & Privacy
Even though the infrastructure code is private, we maintain total transparency regarding its behavior:

* **No Tracking:** The proxy does not store IP addresses, user identifiers, or any telemetry data.
* **No Modification:** The service only filters official release metadata from GitHub. It never modifies the download URLs or the binaries.
* **Verified Source:** All updates served are fetched directly from the official `CodigoSH/Lastboard` repository.

### Reporting a Vulnerability
If you discover a security vulnerability within this project or our update infrastructure, please contact us directly. 

We ask that you do not report security vulnerabilities through public GitHub issues. We will acknowledge your report within 48 hours and provide a timeline for resolution.
