# DNS Setup Guide for circleseven.co.uk

## Overview

This guide will help you configure DNS for your Circle Seven website migration from WordPress/Krystal to GitHub Pages with Cloudflare.

**Current Setup:**
- Domain: circleseven.co.uk (registered at 123Reg)
- Old hosting: Krystal WordPress hosting
- New hosting: GitHub Pages (free)
- DNS provider: Will move to Cloudflare (free, better features)

**Why Cloudflare?**
- Free email forwarding
- Better DDoS protection
- Free SSL certificates
- CDN for faster site delivery
- Better DNS management interface
- Analytics

---

## Step 1: Prepare Your GitHub Pages Site

Before changing DNS, ensure GitHub Pages is ready:

### 1.1 Add Custom Domain in GitHub

1. Go to your GitHub repository
2. Navigate to: **Settings → Pages**
3. Under "Custom domain", enter: `www.circleseven.co.uk`
4. Click **Save**
5. Wait for DNS check (will show pending until DNS is updated)

### 1.2 Create CNAME File

GitHub automatically creates this, but verify it exists:

1. Check your repository for a file named `CNAME` in the root
2. It should contain: `www.circleseven.co.uk`
3. If it doesn't exist, create it:

```bash
echo "www.circleseven.co.uk" > CNAME
git add CNAME
git commit -m "Add custom domain CNAME"
git push
```

---

## Step 2: Set Up Cloudflare Account

### 2.1 Create Cloudflare Account

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up with your email (free account)
3. Verify your email address
4. Log in to Cloudflare dashboard

### 2.2 Add Your Domain

1. Click "**Add a Site**" button
2. Enter: `circleseven.co.uk` (without www)
3. Click "**Add site**"
4. Select the **Free** plan
5. Click "**Continue**"

### 2.3 Cloudflare Scans Your DNS

Cloudflare will scan your current DNS records at Krystal/123Reg. This takes 1-2 minutes.

**Important**: Review the scanned records carefully. You'll see:
- A records (pointing to Krystal server IPs)
- MX records (email configuration)
- TXT records (SPF, domain verification)
- CNAME records (subdomains)

**DO NOT DELETE ANY RECORDS YET** - We'll update them in the next step.

---

## Step 3: Configure DNS Records in Cloudflare

### 3.1 Update DNS Records for GitHub Pages

Once Cloudflare finishes scanning, you need to modify the DNS records:

#### Delete Old Krystal A Records

Find and **delete** any existing A records pointing to Krystal server IPs.

#### Add New GitHub Pages A Records

Click "**Add record**" and add these 4 A records (one at a time):

| Type | Name | IPv4 address | Proxy status | TTL |
|------|------|--------------|--------------|-----|
| A    | @    | 185.199.108.153 | DNS only (gray cloud) | Auto |
| A    | @    | 185.199.109.153 | DNS only (gray cloud) | Auto |
| A    | @    | 185.199.110.153 | DNS only (gray cloud) | Auto |
| A    | @    | 185.199.111.153 | DNS only (gray cloud) | Auto |

**Important**:
- Name should be `@` (represents root domain circleseven.co.uk)
- Proxy status: Keep **OFF** (gray cloud) initially
- These are GitHub Pages official IPs

#### Add/Update CNAME Record for www

Find or add a CNAME record:

| Type | Name | Target | Proxy status | TTL |
|------|------|--------|--------------|-----|
| CNAME | www | YOUR_GITHUB_USERNAME.github.io | DNS only (gray cloud) | Auto |

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

**Example**: If your GitHub username is `johndoe`, the target should be `johndoe.github.io`

### 3.2 Preserve Email Records (if any)

If you currently use email with your domain:

1. **Keep all MX records** (these handle email)
2. **Keep TXT records** for SPF (email authentication)
3. Don't delete these - we'll set up email forwarding later

If you're not sure, **leave them as-is** for now.

### 3.3 Review Final DNS Configuration

Your DNS records should look like this:

```
Type    Name    Content
----    ----    -------
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
CNAME   www     YOUR_USERNAME.github.io
MX      @       [existing mail server] (if you have email)
TXT     @       [existing SPF record] (if you have email)
```

Click "**Continue**" when done.

---

## Step 4: Update Nameservers at 123Reg

Now you need to tell 123Reg to use Cloudflare's nameservers.

### 4.1 Get Cloudflare Nameservers

Cloudflare will show you two nameservers. They look like:
```
carter.ns.cloudflare.com
june.ns.cloudflare.com
```

**Copy these** - you'll need them in the next step.

### 4.2 Log into 123Reg

1. Go to: https://www.123-reg.co.uk
2. Log in to your account
3. Go to "**Domain names**" section
4. Find and click on: **circleseven.co.uk**

### 4.3 Change Nameservers

1. Click "**Manage**" next to your domain
2. Find "**Nameservers**" section
3. Click "**Change**" or "**Edit nameservers**"
4. Select "**Use custom nameservers**"
5. Delete the current nameservers
6. Add Cloudflare's two nameservers:
   - Nameserver 1: `carter.ns.cloudflare.com` (use your actual ones)
   - Nameserver 2: `june.ns.cloudflare.com` (use your actual ones)
7. Click "**Save**" or "**Update**"

### 4.4 Confirm in Cloudflare

1. Return to your Cloudflare tab
2. Click "**Done, check nameservers**"
3. Cloudflare will verify the change

**Note**: This can take **24-48 hours** to fully propagate, but often happens within 1-2 hours.

---

## Step 5: Wait for DNS Propagation

### 5.1 Check Propagation Status

You can check DNS propagation at:
- https://dnschecker.org
- Enter: `circleseven.co.uk`
- Select: `A record`

You should see the GitHub Pages IPs (185.199.108.153, etc.) propagating globally.

### 5.2 Cloudflare Activation

Cloudflare will send you an email when your site is active. Usually within:
- 1-2 hours: Partial propagation
- 24 hours: Full propagation
- 48 hours: Maximum time

### 5.3 Test Your Domain

Once active, test:

```bash
# Check A record
dig circleseven.co.uk A

# Check CNAME record
dig www.circleseven.co.uk CNAME

# Check nameservers
dig circleseven.co.uk NS
```

You should see:
- A records pointing to GitHub Pages IPs
- CNAME pointing to your GitHub Pages URL
- Nameservers pointing to Cloudflare

---

## Step 6: Enable HTTPS in GitHub Pages

Once DNS is fully propagated:

### 6.1 Enable HTTPS

1. Go to GitHub repository: **Settings → Pages**
2. You should now see "**DNS check successful**" ✓
3. Check the box: "**Enforce HTTPS**"
4. Wait 5-10 minutes for SSL certificate provisioning

GitHub automatically provisions a Let's Encrypt SSL certificate.

### 6.2 Verify HTTPS

Visit your site:
```
https://www.circleseven.co.uk
https://circleseven.co.uk
```

Both should work with a valid SSL certificate (padlock icon in browser).

---

## Step 7: Set Up Cloudflare Email Forwarding

Since you're moving away from Krystal, you need email forwarding.

### 7.1 Enable Email Routing

1. In Cloudflare dashboard, select your domain
2. Click "**Email**" in the left sidebar
3. Click "**Email Routing**"
4. Click "**Get started**"

Cloudflare will automatically configure the necessary DNS records:
- MX records (mail exchange)
- TXT records (SPF, DKIM)

### 7.2 Add Destination Email

1. Click "**Destination addresses**"
2. Click "**Add destination**"
3. Enter your personal email (e.g., `yourname@gmail.com`)
4. Click "**Send**"
5. Check your email for verification link
6. Click the verification link

### 7.3 Create Forwarding Rules

1. Click "**Routing rules**"
2. Click "**Create address**"
3. Add forwarding rules:

| Custom address | Destination |
|----------------|-------------|
| info@circleseven.co.uk | yourname@gmail.com |
| hello@circleseven.co.uk | yourname@gmail.com |
| contact@circleseven.co.uk | yourname@gmail.com |

Add as many as you need.

4. Click "**Save and activate**"

### 7.4 Test Email Forwarding

1. Send a test email to: `info@circleseven.co.uk`
2. Check it arrives in your personal email inbox
3. Reply to verify sending works

**Note**: Replies will come from your personal email, not @circleseven.co.uk

**For professional sending from @circleseven.co.uk**, consider:
- **Google Workspace** ($6/user/month) - Full Gmail with custom domain
- **Zoho Mail** (Free for 1 domain, 5 users) - Free professional email
- **Microsoft 365** ($6/user/month) - Outlook with custom domain

---

## Step 8: Enable Cloudflare Features (Optional)

### 8.1 Enable Proxy (Orange Cloud)

Once your site is working:

1. Go to DNS settings in Cloudflare
2. Toggle "Proxy status" to **ON** (orange cloud) for:
   - A records (@)
   - CNAME record (www)

This enables:
- CDN caching
- DDoS protection
- Better performance

### 8.2 Configure SSL/TLS Settings

1. Go to "**SSL/TLS**" in Cloudflare
2. Select: "**Full**" or "**Full (strict)**"
3. Enable "**Always Use HTTPS**"

### 8.3 Set Up Page Rules (Optional)

Create a page rule to redirect root to www:

1. Go to "**Rules → Page Rules**"
2. Click "**Create Page Rule**"
3. URL pattern: `circleseven.co.uk/*`
4. Setting: "**Forwarding URL**" → 301 Redirect
5. Destination: `https://www.circleseven.co.uk/$1`
6. Click "**Save**"

This ensures all traffic goes to `www.circleseven.co.uk`

---

## Step 9: Final Verification Checklist

- [ ] DNS propagated (check dnschecker.org)
- [ ] www.circleseven.co.uk loads with HTTPS
- [ ] circleseven.co.uk redirects to www.circleseven.co.uk
- [ ] SSL certificate valid (padlock in browser)
- [ ] Email forwarding working
- [ ] GitHub Pages shows "DNS check successful"
- [ ] Cloudflare dashboard shows "Active"
- [ ] All site pages and images loading correctly

---

## Troubleshooting

### DNS Not Propagating

**Problem**: Site still showing old Krystal hosting

**Solution**:
1. Verify nameservers at 123Reg are set to Cloudflare
2. Wait 24-48 hours for full propagation
3. Clear your browser cache
4. Try accessing from different network/device

### HTTPS Not Working

**Problem**: "Not Secure" warning or certificate error

**Solution**:
1. Wait 10-15 minutes after enabling HTTPS in GitHub Pages
2. Verify DNS is fully propagated
3. Check GitHub Pages settings show "HTTPS enforced"
4. Clear browser cache and try again

### Email Not Forwarding

**Problem**: Emails to @circleseven.co.uk not arriving

**Solution**:
1. Check Email Routing is enabled in Cloudflare
2. Verify destination email is verified
3. Check MX records exist in Cloudflare DNS
4. Check spam folder
5. Send test email and check Cloudflare Email Logs

### GitHub Pages Not Building

**Problem**: Changes not appearing on live site

**Solution**:
1. Check GitHub Actions tab for build errors
2. Verify CNAME file contains correct domain
3. Check _config.yml has correct url setting
4. Force rebuild by pushing a commit

### 404 Errors on Pages

**Problem**: Individual pages showing 404

**Solution**:
1. Check file exists in repository
2. Verify permalink in front matter is correct
3. Ensure Jekyll build succeeded
4. Check for typos in URLs

---

## Rollback Plan (If Something Goes Wrong)

If you need to revert back to Krystal:

### Quick Rollback

1. Log into 123Reg
2. Go to domain → Nameservers
3. Change back to original nameservers (check old email for these)
4. Wait 1-2 hours for DNS to revert

### Cloudflare Rollback

If you want to keep Cloudflare but point back to Krystal:

1. In Cloudflare DNS settings
2. Delete GitHub Pages A records
3. Add back old Krystal A record (check old hosting for IP)
4. Update www CNAME to point to Krystal

**Note**: You should have backed up all Krystal settings before starting migration!

---

## Post-Migration Checklist

After DNS is fully migrated and stable:

- [ ] Monitor site for 1 week
- [ ] Check Google Search Console for crawl errors
- [ ] Update sitemap in search engines
- [ ] Test all forms and functionality
- [ ] Monitor Cloudflare analytics
- [ ] Verify backup strategy is in place
- [ ] **Cancel Krystal hosting** (only after verifying everything works!)

---

## Support Resources

### DNS Propagation Check
- https://dnschecker.org
- https://www.whatsmydns.net

### Cloudflare Support
- Docs: https://developers.cloudflare.com
- Community: https://community.cloudflare.com
- Status: https://www.cloudflarestatus.com

### GitHub Pages Support
- Docs: https://docs.github.com/en/pages
- Community: https://github.community

### 123Reg Support
- Help: https://www.123-reg.co.uk/support
- Phone: 0333 0142 700

---

## Timeline Summary

| Task | Time Required |
|------|---------------|
| Set up Cloudflare account | 10 minutes |
| Configure DNS in Cloudflare | 15 minutes |
| Update nameservers at 123Reg | 5 minutes |
| Wait for DNS propagation | 1-24 hours |
| Enable HTTPS in GitHub Pages | 10 minutes |
| Set up email forwarding | 15 minutes |
| Test and verify | 30 minutes |
| **Total** | **~2-26 hours** |

Most of this is waiting time. Active work is about 1 hour.

---

Good luck with your DNS migration! Take your time and verify each step before moving to the next one.
