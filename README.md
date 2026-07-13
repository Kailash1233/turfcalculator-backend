# Turf Calculator Email API

Backend API service for sending PDF estimates via email using Nodemailer.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

### 3. Configure Email Service
Update `.env` with your email provider settings:

```env
# Gmail Example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Outlook Example
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password

# Custom SMTP
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Production Server
```bash
npm start
```

## 📧 Email Provider Setup

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account → Security → App passwords
3. Use App Password in `SMTP_PASS`

### Outlook Setup
1. Enable 2-Factor Authentication
2. Use your regular password
3. May need to enable "Less secure app access"

### Custom SMTP
- Use your hosting provider's SMTP settings
- Or use services like SendGrid, Mailgun, etc.

## 🔧 API Endpoints

### Health Check
```
GET /api/health
```

### Send Estimate Email
```
POST /api/send-estimate
Content-Type: multipart/form-data

Body:
- pdf: PDF file (binary)
- name: string
- email: string
- phone: string
- timeline: string
- mode: 'standard' | 'cage360'
- environment: 'indoor' | 'outdoor'
- grassType: 'rubber' | 'eco' | 'aqua'
- sizeSqft: number
- rateMin: number
- rateMax: number
- totalEstimate: number
- createdAtIST: string
```

## 🛡️ Security Features

- **Rate Limiting**: 10 requests per 15 minutes per IP
- **Input Validation**: Joi schema validation
- **CORS Protection**: Configurable origins
- **Helmet Security**: Security headers
- **File Size Limits**: 10MB max file size
- **Error Handling**: Comprehensive error responses

## 🚀 Deployment Options

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add SMTP_HOST
vercel env add SMTP_USER
vercel env add SMTP_PASS
# ... add all required env vars
```

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

### Docker
```bash
# Build image
docker build -t turf-calculator-api .

# Run container
docker run -p 3001:3001 --env-file .env turf-calculator-api
```

### Heroku
```bash
# Install Heroku CLI
# Create Procfile: web: node server.js

# Deploy
git add .
git commit -m "Deploy API"
git push heroku main

# Set environment variables
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_USER=your-email@gmail.com
# ... set all required vars
```

## 📊 Monitoring

### Health Check
```bash
curl https://your-api-domain.com/api/health
```

### Logs
- Check deployment platform logs
- Monitor email delivery rates
- Track API usage and errors

## 🔍 Troubleshooting

### Common Issues

1. **Email Authentication Failed**
   - Check SMTP credentials
   - Verify 2FA is enabled
   - Use App Password for Gmail

2. **Rate Limit Exceeded**
   - Wait 15 minutes
   - Check IP restrictions
   - Adjust rate limit settings

3. **File Upload Failed**
   - Check file size (max 10MB)
   - Verify Content-Type is multipart/form-data
   - Check server storage limits

4. **CORS Errors**
   - Update FRONTEND_URL in environment
   - Check CORS configuration
   - Verify domain matches exactly

### Debug Mode
Set `NODE_ENV=development` for detailed error logs.

## 📈 Performance

- **Compression**: Gzip compression enabled
- **Rate Limiting**: Prevents abuse
- **Memory Management**: Efficient file handling
- **Error Recovery**: Graceful failure handling

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] SMTP credentials protected
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] File size limits set
- [ ] Input validation enabled
- [ ] Error messages sanitized
- [ ] HTTPS enabled in production

## 📞 Support

For issues:
1. Check logs for error details
2. Verify environment configuration
3. Test with health check endpoint
4. Check email provider status
5. Review rate limiting settings

