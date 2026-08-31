# APCS Website — Infrastructure Cost Breakdown

> **Prepared for:** Stakeholders  
> **Last Updated:** August 2026  
> **Currency:** USD (with IDR estimates where applicable)

---

## 1. Executive Summary

This document outlines the recurring and one-time costs required to build and maintain the APCS (Asia Pacific Choral Summit) web platform. The architecture uses **Firebase** for database & authentication, **AWS S3** for file storage, **Cloudflare** for CDN/security, and a **web server** for the backend API.

### Estimated Monthly Cost Range

| Scenario | Estimated Monthly Cost (USD) |
| :--- | :--- |
| **Low Traffic** (≤500 users/month) | **$5 – $15** |
| **Medium Traffic** (500–5,000 users/month) | **$15 – $50** |
| **High Traffic / Event Peak** (5,000+ users/month) | **$50 – $150+** |

> [!NOTE]
> Most services used have generous free tiers. For a seasonal event platform like APCS, costs will remain low during off-season months and may spike only around event dates.

---

## 2. Domain Name Registration

| Item | Cost (USD/year) | Cost (IDR/year) | Billing |
| :--- | :--- | :--- | :--- |
| `.com` domain | $10 – $25 | Rp 160,000 – Rp 400,000 | Annual |
| `.id` domain | $15 – $30 | Rp 225,000 – Rp 350,000 | Annual |
| `.co.id` domain | $15 – $30 | Rp 225,000 – Rp 350,000 | Annual |
| WHOIS Privacy | Usually included free | — | — |

**Recommended:** Purchase a `.com` domain from a reputable registrar (e.g., Namecheap, Google Domains, Cloudflare Registrar).

> [!TIP]
> Cloudflare Registrar sells domains **at wholesale cost** with no markup — often the cheapest option for `.com` domains.

**Estimated Annual Cost: ~$10 – $25/year**

---

## 3. Web Server / Hosting (Backend API)

The backend runs on **Node.js with Express**. Options for hosting:

### Option A: VPS (Recommended for Cost Control)

| Provider | Plan | Monthly Cost | Specs |
| :--- | :--- | :--- | :--- |
| **DigitalOcean** | Basic Droplet | $6/month | 1 vCPU, 1 GB RAM, 25 GB SSD |
| **Vultr** | Cloud Compute | $6/month | 1 vCPU, 1 GB RAM, 25 GB SSD |
| **Linode (Akamai)** | Nanode | $5/month | 1 vCPU, 1 GB RAM, 25 GB SSD |
| **Hetzner** | CX22 | ~$4/month | 2 vCPU, 4 GB RAM, 40 GB SSD |

### Option B: Platform-as-a-Service (Simpler, Slightly More Expensive)

| Provider | Plan | Monthly Cost | Notes |
| :--- | :--- | :--- | :--- |
| **Railway** | Starter | $5 + usage | Easy deploy from Git |
| **Render** | Starter | $7/month | Free tier available (with cold starts) |
| **Fly.io** | Hobby | $0 – $10 | Pay per usage, generous free tier |

### Option C: Firebase Hosting / Cloud Run (Serverless)

| Provider | Plan | Monthly Cost | Notes |
| :--- | :--- | :--- | :--- |
| **Firebase Hosting** | Blaze | $0 – $5 | Free up to 10 GiB bandwidth/month |
| **Google Cloud Run** | Pay-per-use | $0 – $10 | Free tier: 2M requests/month |

**Recommended: Option A (VPS) — $5–$6/month** for predictable costs with full server control.

---

## 4. Firebase (Database + Authentication)

### 4.1 Firestore Database

| Resource | Free Tier (Daily) | Blaze Plan Overage |
| :--- | :--- | :--- |
| Document Reads | 50,000/day | $0.06 per 100K reads |
| Document Writes | 20,000/day | $0.18 per 100K writes |
| Document Deletes | 20,000/day | $0.02 per 100K deletes |
| Stored Data | 1 GiB total | $0.18 per GiB/month |
| Network Egress | 10 GiB/month | $0.12 per GiB |

> [!NOTE]
> For APCS usage (registration forms, ticketing, jury scoring), the **free tier should cover most needs**. Usage spikes are expected only during event registration windows and scoring periods.

### 4.2 Firebase Authentication

| Auth Method | Free Tier | Overage |
| :--- | :--- | :--- |
| Email / Social Login | 50,000 MAUs free | ~$0.0055 per additional MAU |
| Phone (SMS) Auth | Not free — Blaze plan required | $0.01 – $0.06 per SMS (varies by region) |

> [!IMPORTANT]
> If you plan to use **Phone/SMS authentication**, costs will vary based on the target region. SMS to Indonesian numbers typically costs ~$0.03–$0.06 per message. For a small user base, email-based auth is recommended to keep costs at **$0**.

### 4.3 Firebase Hosting (Frontend Static Files)

| Resource | Free Tier | Blaze Plan Overage |
| :--- | :--- | :--- |
| Storage | 5 GB | $0.10 per GB |
| Bandwidth | 10 GiB/month | $0.15 – $0.20 per GiB |

**Estimated Firebase Total: $0 – $5/month** (within free tier for typical APCS usage)

---

## 5. AWS S3 (File Storage)

Used for storing uploaded files (e.g., participant documents, repertoire PDFs, event images).

| Resource | Cost |
| :--- | :--- |
| Storage (S3 Standard) | $0.023 per GB/month |
| PUT/POST Requests | $0.005 per 1,000 requests |
| GET Requests | $0.0004 per 1,000 requests |
| Data Transfer Out | First 100 GB free, then $0.09/GB |

### Estimated Usage for APCS

| Usage Scenario | Estimated Storage | Estimated Monthly Cost |
| :--- | :--- | :--- |
| ~500 uploaded files (~5 GB total) | 5 GB | ~$0.12 |
| ~2,000 uploaded files (~20 GB total) | 20 GB | ~$0.46 |
| ~5,000 uploaded files (~50 GB total) | 50 GB | ~$1.15 |

> [!TIP]
> AWS provides a **12-month free tier** for new accounts: 5 GB S3 Standard storage, 20,000 GET requests, and 2,000 PUT requests per month — more than enough for the initial launch.

**Estimated Monthly Cost: $0 – $2/month**

---

## 6. Cloudflare (CDN + Security + DNS)

### Plan Comparison

| Feature | Free Plan ($0) | Pro Plan ($25/month) |
| :--- | :--- | :--- |
| Global CDN | ✅ | ✅ |
| Universal SSL | ✅ | ✅ |
| DDoS Protection | ✅ Basic | ✅ Enhanced |
| Web Application Firewall | 5 custom rules | 20 custom rules |
| Page Rules | 3 rules | 20 rules |
| Analytics | Basic | Advanced |
| DNS Management | ✅ | ✅ |
| Automatic HTTPS Rewrites | ✅ | ✅ |

**Recommended: Free Plan ($0/month)** — The free tier provides excellent CDN, SSL, DDoS protection, and DNS management. More than sufficient for APCS.

> [!NOTE]
> Cloudflare's **free plan** is one of the best values in web infrastructure. It provides enterprise-grade DDoS protection, global CDN, and free SSL at no cost. Upgrade to Pro only if you need advanced WAF rules or detailed analytics.

**Estimated Monthly Cost: $0**

---

## 7. Total Cost Summary

### One-Time / Annual Costs

| Item | Cost | Frequency |
| :--- | :--- | :--- |
| Domain Registration (.com) | $10 – $25 | Annual |
| **Annual Total** | **$10 – $25** | — |

### Monthly Recurring Costs

| Service | Low Estimate | High Estimate | Notes |
| :--- | :--- | :--- | :--- |
| Web Server (VPS) | $5 | $6 | DigitalOcean / Vultr / Linode |
| Firebase Firestore | $0 | $5 | Free tier covers most usage |
| Firebase Auth | $0 | $0 | Email auth is free up to 50K MAUs |
| Firebase Hosting | $0 | $2 | Free tier: 10 GiB bandwidth |
| AWS S3 | $0 | $2 | Free tier for first 12 months |
| Cloudflare | $0 | $0 | Free plan recommended |
| **Monthly Total** | **$5** | **$15** | — |

### Annual Projection

| Scenario | Monthly | Annual (incl. Domain) |
| :--- | :--- | :--- |
| **Minimum (Low Traffic)** | ~$5 | **~$70 – $85/year** |
| **Typical (Medium Traffic)** | ~$10–$15 | **~$130 – $205/year** |
| **Peak Event Season** | ~$30–$50 | **~$370 – $625/year** |

---

## 8. Cost Optimization Tips

1. **Leverage Free Tiers** — Firebase, AWS, and Cloudflare all offer generous free tiers that should cover most APCS needs during non-event periods.

2. **Set Budget Alerts** — Configure billing alerts on both Google Cloud Console (Firebase) and AWS to prevent unexpected charges.

3. **Use Cloudflare as CDN** — Route all traffic through Cloudflare to reduce bandwidth costs on Firebase Hosting and AWS S3.

4. **Optimize Firestore Reads** — Implement client-side caching and pagination to minimize Firestore read operations.

5. **Archive Old Data** — Move event data from previous years to cheaper storage tiers (e.g., S3 Glacier) to reduce ongoing storage costs.

6. **Scale Server During Events** — Use the smallest VPS plan during off-season and temporarily upgrade during event registration periods.

---

## 9. Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   End User   │────▶│  Cloudflare  │────▶│ Firebase Hosting │
│  (Browser)   │     │  (CDN/DNS)   │     │   (Frontend)     │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐     ┌─────────────────┐
                    │  VPS Server  │────▶│    Firebase      │
                    │  (Node.js)   │     │  (Firestore DB)  │
                    │  (Express)   │     │  (Auth)          │
                    └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   AWS S3     │
                    │ (File Store) │
                    └──────────────┘
```

---

> [!IMPORTANT]
> All prices listed are estimates based on publicly available pricing as of August 2026. Actual costs may vary based on region, usage patterns, and provider pricing changes. Always verify current rates on the official pricing pages before making purchasing decisions.

---

*Document maintained as part of APCS project documentation.*
