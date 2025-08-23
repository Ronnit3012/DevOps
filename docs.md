Here’s a **ready-to-use prerequisites section** you can drop into your guide 👇

---

## Prerequisites

Before enabling multi-URL support in **Pyneta**, it is important to understand the following concepts:

* **Multi-URL support**
  This means that the application can be accessed and function correctly from more than one base URL. For example, a single deployment of Pyneta might be reachable at both `https://app.domain.com` and `https://app.us-east-1.domain.com`.

* **Vanity URLs**
  Vanity URLs are friendly or custom domains (often branded or region-specific) that point to the same application backend. They are the most common way to implement multi-URL support. For example, `https://app.eu-west-1.domain.com` might serve European users while `https://app.us-east-1.domain.com` serves US users.

* **Why this matters**
  When users access Pyneta through different URLs, the application must ensure consistent authentication, redirects, and user experience regardless of which domain they start from. To achieve this, all relevant URLs must be configured both at the infrastructure layer (load balancers, ingress, certificates) and within the application.

---

Would you like me to also draft a **short visual example (diagram)** showing a user accessing Pyneta via two vanity URLs that both point to the same backend? That could make this prerequisites section even clearer.
