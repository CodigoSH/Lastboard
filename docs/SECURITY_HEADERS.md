# Security Headers Implementation

## HSTS (HTTP Strict Transport Security)

### What is HSTS?

HSTS is a security header that tells browsers to **always** use HTTPS when connecting to your domain, even if the user types `http://` in the address bar or clicks on an HTTP link.

### Implementation Details

**Header Value:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Parameters:**
- `max-age=31536000`: Browser remembers this for 1 year (365 days)
- `includeSubDomains`: Applies to all subdomains (e.g., `api.yourdomain.com`)
- `preload`: Eligible for browser preload lists (hardcoded HTTPS-only)

### How It Works

1. **First Visit:** User connects via HTTPS → Server sends HSTS header
2. **Browser Stores:** Browser remembers "always use HTTPS for this domain"
3. **Future Visits:** Browser automatically upgrades HTTP → HTTPS (client-side, no request sent)
4. **Invalid Cert:** Browser blocks connection (no "proceed anyway" option)

### Security Benefits

✅ **Prevents SSL Stripping Attacks**
- Attacker can't downgrade HTTPS → HTTP on public WiFi

✅ **Prevents Mixed Content**
- Forces all resources to load over HTTPS

✅ **Improves User Privacy**
- No HTTP requests ever sent (avoids ISP/network snooping)

✅ **SEO Benefits**
- Google prioritizes HTTPS sites in rankings

### Requirements

⚠️ **IMPORTANT:** HSTS only activates when:
1. Connection is over HTTPS (TLS/SSL)
2. Valid SSL certificate is present

**The implementation automatically detects:**
- Direct TLS connections (`r.TLS != nil`)
- Reverse proxy HTTPS (`X-Forwarded-Proto: https`)
- AWS CloudFront (`CloudFront-Forwarded-Proto: https`)

### Testing HSTS

**1. Check Header (curl):**
```bash
curl -I https://yourdomain.com
# Should return:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**2. Browser DevTools:**
- Open Network tab
- Check response headers
- Look for `Strict-Transport-Security`

**3. Online Scanners:**
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

### HSTS Preload List

To submit your domain to browser preload lists:

1. **Ensure you meet requirements:**
   - Serve valid certificate on root and all subdomains
   - Redirect HTTP → HTTPS (301 permanent)
   - Serve HSTS header on HTTPS with `preload` directive
   - `max-age` at least 31536000 seconds (1 year)

2. **Submit to preload list:**
   - Visit: https://hstspreload.org/
   - Enter your domain
   - Follow submission process

3. **Warning:** Preload is **difficult to remove**
   - Takes months to propagate removal
   - Only submit if you're 100% committed to HTTPS forever

### Troubleshooting

**Problem:** "HSTS header not appearing"
- **Solution:** Ensure you're accessing via HTTPS
- HSTS is intentionally NOT sent over HTTP

**Problem:** "Can't access site after enabling HSTS"
- **Cause:** Invalid/expired SSL certificate
- **Solution:** Fix certificate issue first

**Problem:** "Subdomains not working"
- **Cause:** `includeSubDomains` directive affects ALL subdomains
- **Solution:** Ensure all subdomains have valid HTTPS

**Clear HSTS in Browser (Emergency):**

**Chrome/Edge:**
1. Visit `chrome://net-internals/#hsts`
2. Enter domain in "Delete domain security policies"
3. Click Delete

**Firefox:**
1. Close Firefox
2. Delete `SiteSecurityServiceState.txt` in profile folder
3. Restart Firefox

### Additional Security Headers (Already Implemented)

- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info

### Recommended Next Steps

Consider implementing additional security headers:

1. **Content-Security-Policy (CSP)**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
   ```

2. **X-XSS-Protection** (Legacy browsers)
   ```
   X-XSS-Protection: 1; mode=block
   ```

3. **Permissions-Policy** (Feature Policy)
   ```
   Permissions-Policy: geolocation=(), microphone=(), camera=()
   ```

### References

- [OWASP HSTS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
- [MDN HSTS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [RFC 6797 - HSTS Specification](https://tools.ietf.org/html/rfc6797)

---

**Implementation Date:** February 12, 2026
**Version:** Lastboard v1.2.0+
