# FAR3ON VPS — Production Readiness Map

## Current architecture (verified from this repository)

- Static Arabic website hosted as Cloudflare Pages assets.
- Browser-only inquiry form: it prepares a message and opens WhatsApp/email only after the visitor clicks.
- No application server, VPS, database, authentication, payment gateway, or stored inquiry records.
- Cloudflare Pages provides edge delivery and serves Gzip/Brotli where possible.

## Status of the requested checklist

| Area | Item | Current status | What to do / why |
|---|---|---|---|
| Security | SSH keys, disable password login, disable root login | Not applicable to static Pages | Apply on a future Linux VPS only; use a second verified SSH session before closing the first. |
| Security | UFW/nftables allow SSH, 80, 443 | Not applicable to static Pages | Cloudflare Pages has no user-managed origin VM firewall. Restrict future VPS ingress to required ports and provider health/management needs. |
| Security | Fail2ban | Not applicable to static Pages | Install only on a future Linux host that exposes SSH or other protected services. |
| Security | unattended-upgrades | Not applicable to static Pages | Enable on every Ubuntu/Debian VM and monitor reboot requirements. |
| Security | TLS/SSL and HTTP → HTTPS | Cloudflare edge capability; account setting pending | Add the actual domain to Pages, wait for active certificate, then enable **Always Use HTTPS** and test both URLs. Pages domain certificates are managed by Cloudflare; do not install Let's Encrypt on Pages. |
| Performance | Nginx/Caddy | Not applicable to static Pages | Pages is the web-serving platform. Use Nginx/Caddy only if a separate VPS origin is introduced. |
| Performance | HTTP/2 and gzip/Brotli | Platform-managed | Cloudflare Pages serves Gzip/Brotli where possible; HTTP/2 is an edge protocol setting. Verify after domain activation. |
| Performance | Cache | Implemented | `_headers` sets revalidation for HTML and short browser caching for assets. Keep cache windows short unless asset filenames become versioned. |
| Performance | CDN | Implemented by platform | Cloudflare Pages distributes static assets through Cloudflare's edge network. |
| Performance | Database tuning | Not applicable | No database currently exists. Revisit indexes, backups, connection limits, and query plans only after choosing a database. |
| Performance | Image compression | Minimal assets currently | Current site uses a small SVG favicon and CSS illustration; optimize any future photos to AVIF/WebP, responsive sizes, and explicit dimensions. |
| Reliability | Daily off-site database backup | Not applicable to current content | No database or customer records exist. Keep source in a private Git repository and retain deploy artifacts. For a future VPS/database, follow the backup plan below. |
| Reliability | Restore drill | Pending for future data services | A code rollback is not a database restore drill. Test a real backup restore before storing customer data. |
| Reliability | Monitoring and alerts | Pending | Add an external HTTPS uptime monitor for `/` and `/request.html`; add Cloudflare Web Analytics only if desired. Netdata/Grafana apply to a VPS, not static Pages. |
| Reliability | systemd/Docker restart policy | Not applicable | There is no long-running app process on Pages. Use systemd or Docker Compose only for a future backend. |
| Operations | Dedicated low-privilege app user | Not applicable | No VM process exists. Create a system user with no interactive shell for a future backend. |
| Operations | Git + CI/CD | Partly implemented | Source should live in Git. `.github/workflows/check.yml` checks files and local links. Connect a Git repository to Cloudflare Pages for deployments. |
| Operations | Staging | Ready for setup | Use a `staging` branch/Preview Deployment, or create a separate `far3on-vps-staging` Pages project. Protect preview URLs with Cloudflare Access if they contain private material. |
| Operations | logrotate | Not applicable | Pages platform logs are not files you administer. Configure logrotate only on a future VPS. |
| Identity | Custom domain and DNS | Pending owner input | Buy/choose a domain, add it under Pages → Custom domains, and follow the exact DNS instructions shown for that domain. |
| Identity | SPF/DKIM/DMARC | Pending mail provider/domain | These records must come from the email provider; do not copy generic SPF/DKIM values. Start DMARC with monitoring (`p=none`) then tighten after reviewing reports. |
| Identity | Custom 404/500 | 404 implemented; 500 template included | Cloudflare Pages automatically serves root `404.html`. `500.html` is a static fallback template and is not automatically wired to a 500 status by Pages without a dynamic error handler. |
| Identity | Privacy/Terms | Draft pages included | Replace draft text with legal entity, contact, applicable law, real data flows, retention, refund, support, SLA and VPS acceptable-use provisions before commercial launch. |

## Cloudflare dashboard tasks still requiring account access

1. In Workers & Pages, attach the real custom domain to this Pages project. Follow the DNS records Cloudflare shows; don't guess an A/CNAME target.
2. Wait until the edge certificate is active. Then SSL/TLS → Edge Certificates → enable **Always Use HTTPS**. Enable HSTS only after HTTPS works correctly on the final hostname and all required subdomains.
3. Use Cloudflare Pages → Settings → Builds to connect GitHub/GitLab for deployment. The current project was initially Direct Upload: Cloudflare documents that a Direct Upload project cannot later be converted into Git integration; create a new Git-connected Pages project if you want automatic deployments.
4. Configure the production branch as `main`; use a `staging` branch for preview deployment. For a separately isolated stage, create a second Pages project and link it to the same repo with `staging` as its production branch.
5. Add an uptime check with an alert email. Monitor the home page and inquiry page. Confirm with an intentional test outage before relying on alerts.
6. Set your real contact email and WhatsApp number in `assets/config.js`. These values are public. Never put tokens, passwords, or private keys there.
7. Do not enable analytics, forms, authentication, payments, or a CRM without updating the privacy notice and reviewing the new data flow.

## Future VPS security baseline (Ubuntu/Debian)

Do this only after a real VPS exists and you have console/recovery access. Adapt SSH port, provider firewall, app runtime, and database before applying. Keep an existing SSH session open until a new key-based session has been tested.

1. Create a named sudo operator; add an SSH public key; test key login in a second terminal. Then set `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, and `PermitRootLogin no` in an SSH drop-in under `/etc/ssh/sshd_config.d/`. Validate with `sshd -t` before reloading SSH. Do not paste a private key into a ticket or form.
2. Configure UFW or nftables to allow only the actual management SSH port plus 80/443. If SSH is moved, allow the new port before removing the old rule. Verify the cloud-provider firewall too.
3. Install and configure Fail2ban for the active SSH daemon; test that the jail sees the correct auth log and does not lock out the operator.
4. Enable `unattended-upgrades`, schedule reboot handling, and maintain a patch/reboot log.
5. Install Nginx or Caddy. Proxy only to the loopback address of the app; do not expose internal app/database ports publicly. Configure gzip or Brotli where supported and validate HTTP/2 after TLS is active.
6. Issue TLS using the chosen ACME client (Let's Encrypt/Certbot or Caddy automation), verify renewal timer/hooks, and run a renewal dry-run. Force HTTPS at the edge/origin once certificates are valid.
7. Run the app under a dedicated non-root system account; use systemd with restart policy, environment file permissions, resource limits where suitable, and no secrets in Git.
8. Put the database on a private interface. Add indexes based on measured query plans, least-privilege DB users, connection limits, and tested migrations.
9. Back up database plus uploads/config metadata daily to a separate provider/account/bucket; encrypt backups, restrict credentials, set retention (for example daily/weekly/monthly according to business needs), alert on failures, and test restores to an isolated environment. A backup job is not complete until restore has been tested.
10. Configure logrotate for application/Nginx logs. Add external uptime checks and host metrics (Netdata or Prometheus/Grafana); alert on disk, memory, CPU, certificate expiry, backup age, and service health.

## Email DNS planning

- SPF: publish exactly one SPF TXT record at the domain root using the mail provider's official include/value. Multiple SPF records can break SPF evaluation.
- DKIM: create the selector TXT/CNAME record supplied by the email provider.
- DMARC: add `_dmarc` TXT after SPF/DKIM are configured; begin with a monitored policy and a real `rua` mailbox, then move toward quarantine/reject after reviewing alignment and reports.
- Do not invent these values; provider-specific values are required.
