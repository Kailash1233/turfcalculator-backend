const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const multer = require("multer");
const Joi = require("joi");
const compression = require("compression");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173"
).split(",");

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ Blocked CORS request from: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/send-estimate", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Email configuration
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Add TLS options for better security
  if (process.env.SMTP_SECURE === "true") {
    config.tls = {
      rejectUnauthorized: false,
    };
  }

  return nodemailer.createTransport(config);
};

// Validation schemas
const estimateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\+91[6-9]\d{9}$/)
    .required(),
  timeline: Joi.string().required(),
  mode: Joi.string().valid("standard", "cage360").required(),
  environment: Joi.string().valid("indoor", "outdoor").required(),
  grassType: Joi.string().valid("rubber", "eco", "aqua").required(),
  sizeSqft: Joi.number().min(4000).required(),
  rateMin: Joi.number().min(0).required(),
  rateMax: Joi.number().min(Joi.ref("rateMin")).required(),
  totalEstimate: Joi.number().min(0).required(),
  createdAtIST: Joi.string().required(),
});

// Email template
const createEmailTemplate = (data) => {
  const modeLabel =
    data.mode === "cage360" ? "360° Turf (Cage)" : "Standard Turf";
  const grassLabel =
    data.mode === "cage360"
      ? "Eco Friendly (360° only)"
      : data.grassType === "eco"
      ? "Eco Friendly"
      : data.grassType === "aqua"
      ? "Aqua"
      : "Rubber";
  const envLabel =
    data.mode === "cage360"
      ? "Outdoor (locked)"
      : data.environment === "indoor"
      ? "Indoor"
      : "Outdoor";

  // return {
  //   subject: `Your Turf Cost Estimate - ₹${data.totalEstimate.toLocaleString('en-IN')} | GameOn Solution`,
  //   html: `
  //     <!DOCTYPE html>
  //     <html lang="en">
  //     <head>
  //       <meta charset="UTF-8">
  //       <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //       <title>Turf Cost Estimate</title>
  //       <style>
  //         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  //         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  //         .header { background: linear-gradient(135deg, #082f0e, #000); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  //         .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
  //         .estimate-box { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  //         .price { font-size: 2.5em; font-weight: bold; color: #eab308; text-align: center; margin: 20px 0; }
  //         .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
  //         .detail-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
  //         .detail-label { font-weight: bold; color: #666; font-size: 0.9em; }
  //         .detail-value { color: #333; margin-top: 5px; }
  //         .cta { text-align: center; margin: 30px 0; }
  //         .btn { background: #eab308; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
  //         .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
  //         .inclusions { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
  //         .inclusions h3 { color: #082f0e; margin-top: 0; }
  //         .inclusions ul { margin: 10px 0; padding-left: 20px; }
  //         .inclusions li { margin: 5px 0; }
  //         @media (max-width: 600px) {
  //           .details { grid-template-columns: 1fr; }
  //           .price { font-size: 2em; }
  //         }
  //       </style>
  //     </head>
  //     <body>
  //       <div class="container">
  //         <div class="header">
  //           <h1>GameOn Solution</h1>
  //           <p>Professional Turf Installation Services</p>
  //         </div>

  //         <div class="content">
  //           <h2>Dear ${data.name},</h2>
  //           <p>Thank you for using our Turf Cost Calculator! We've prepared your personalized estimate based on your requirements.</p>

  //           <div class="estimate-box">
  //             <h3 style="text-align: center; color: #082f0e; margin-top: 0;">Your Turf Cost Estimate</h3>
  //             <div class="price">₹${data.totalEstimate.toLocaleString('en-IN')}</div>

  //             <div class="details">
  //               <div class="detail-item">
  //                 <div class="detail-label">Project Mode</div>
  //                 <div class="detail-value">${modeLabel}</div>
  //               </div>
  //               <div class="detail-item">
  //                 <div class="detail-label">Environment</div>
  //                 <div class="detail-value">${envLabel}</div>
  //               </div>
  //               <div class="detail-item">
  //                 <div class="detail-label">Grass Type</div>
  //                 <div class="detail-value">${grassLabel}</div>
  //               </div>
  //               <div class="detail-item">
  //                 <div class="detail-label">Ground Size</div>
  //                 <div class="detail-value">${data.sizeSqft.toLocaleString('en-IN')} sq.ft</div>
  //               </div>
  //               <div class="detail-item">
  //                 <div class="detail-label">Rate Range</div>
  //                 <div class="detail-value">₹${data.rateMin}-₹${data.rateMax} per sq.ft</div>
  //               </div>
  //               <div class="detail-item">
  //                 <div class="detail-label">Timeline</div>
  //                 <div class="detail-value">${data.timeline}</div>
  //               </div>
  //             </div>
  //           </div>

  //           <div class="inclusions">
  //             <h3>What's Included in This Estimate:</h3>
  //             <ul>
  //               <li>Complete turf installation</li>
  //               <li>Civil work and base preparation</li>
  //               <li>Drainage system installation</li>
  //               <li>Fabrication and goal posts</li>
  //               <li>Lighting works (200W flood lights)</li>
  //               <li>Net covering and electrical wiring</li>
  //               <li>Field markings and finishing</li>
  //               <li>2-year warranty on all work</li>
  //             </ul>
  //           </div>

  //           <div class="cta">
  //             <a href="https://gameonsolution.in/contact" class="btn">Get Started Today</a>
  //           </div>

  //           <p><strong>Next Steps:</strong></p>
  //           <ul>
  //             <li>Our team will contact you within 24 hours</li>
  //             <li>We'll schedule a site visit for accurate assessment</li>
  //             <li>Final quote will be provided after site evaluation</li>
  //             <li>Project timeline will be confirmed based on your requirements</li>
  //           </ul>

  //           <p><strong>Contact Information:</strong></p>
  //           <p>📞 Phone: +91 96157 37373<br>
  //           📧 Email: info@gameonsolution.in<br>
  //           🌐 Website: <a href="https://gameonsolution.in">gameonsolution.in</a></p>
  //         </div>

  //         <div class="footer">
  //           <p>This estimate is valid for 30 days and subject to site evaluation.</p>
  //           <p>© 2024 GameOn Solution. All rights reserved.</p>
  //         </div>
  //       </div>
  //     </body>
  //     </html>
  //   `,
  //   text: `
  //     Dear ${data.name},

  //     Thank you for using our Turf Cost Calculator! Here's your personalized estimate:

  //     PROJECT DETAILS:
  //     - Mode: ${modeLabel}
  //     - Environment: ${envLabel}
  //     - Grass Type: ${grassLabel}
  //     - Ground Size: ${data.sizeSqft.toLocaleString('en-IN')} sq.ft
  //     - Rate Range: ₹${data.rateMin}-₹${data.rateMax} per sq.ft
  //     - Timeline: ${data.timeline}

  //     TOTAL ESTIMATE: ₹${data.totalEstimate.toLocaleString('en-IN')}

  //     WHAT'S INCLUDED:
  //     - Complete turf installation
  //     - Civil work and base preparation
  //     - Drainage system installation
  //     - Fabrication and goal posts
  //     - Lighting works (200W flood lights)
  //     - Net covering and electrical wiring
  //     - Field markings and finishing
  //     - 2-year warranty on all work

  //     NEXT STEPS:
  //     - Our team will contact you within 24 hours
  //     - We'll schedule a site visit for accurate assessment
  //     - Final quote will be provided after site evaluation

  //     CONTACT US:
  //     Phone: +91 96157 37373
  //     Email: info@gameonsolution.in
  //     Website: https://gameonsolution.in

  //     This estimate is valid for 30 days and subject to site evaluation.

  //     Best regards,
  //     GameOn Solution Team
  //   `
  // };
  return {
    subject: `Your Turf Project Overview - ₹${data.totalEstimate.toLocaleString(
      "en-IN"
    )} | GameOn Solution`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Turf Project Overview</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #082f0e, #000); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .estimate-box { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .price { font-size: 2.5em; font-weight: bold; color: #eab308; text-align: center; margin: 20px 0; }
          .details { margin: 20px 0; }
          .detail-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
          .detail-label { font-weight: bold; color: #666; font-size: 0.9em; }
          .detail-value { color: #333; margin-top: 5px; }
          .cta { text-align: center; margin: 30px 0; }
          .btn { background: #eab308; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
          .inclusions { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .inclusions h3 { color: #082f0e; margin-top: 0; }
          .inclusions ul { margin: 10px 0; padding-left: 20px; }
          .inclusions li { margin: 5px 0; }
          @media (max-width: 600px) {
            .price { font-size: 2em; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GameOn Solution</h1>
            <p>Professional Turf Installation Services</p>
          </div>
          
          <div class="content">
            <h2>Dear ${data.name},</h2>
            <p>Thank you for reaching out to GameOn Solution. We have compiled your personalized project overview based on your specific requirements.</p>
            
            <div class="estimate-box">
              <h3 style="text-align: center; color: #082f0e; margin-top: 0;">Project Summary</h3>
              <div class="price">₹${data.totalEstimate.toLocaleString(
                "en-IN"
              )}</div>
              
              <div class="details">
                <div class="detail-item">
                  <div class="detail-label">Project Mode</div>
                  <div class="detail-value">${modeLabel}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Environment</div>
                  <div class="detail-value">${envLabel}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Grass Type</div>
                  <div class="detail-value">${grassLabel}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Ground Size</div>
                  <div class="detail-value">${data.sizeSqft.toLocaleString(
                    "en-IN"
                  )} sq.ft</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Projected Rate Range</div>
                  <div class="detail-value">₹${data.rateMin}-₹${
      data.rateMax
    } per sq.ft</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Timeline</div>
                  <div class="detail-value">${data.timeline}</div>
                </div>
              </div>
            </div>
            
            <div class="inclusions">
              <h3>What is Included in Your Blueprint:</h3>
              <ul>
                <li>Complete turf installation</li>
                <li>Civil work and base preparation</li>
                <li>Drainage system installation</li>
                <li>Fabrication and goal posts</li>
                <li>Lighting works (200W flood lights)</li>
                <li>Net covering and electrical wiring</li>
                <li>Field markings and finishing</li>
                <li>2-year warranty on all work</li>
              </ul>
            </div>
            
            <div class="cta">
              <a href="https://gameonsolution.in/contact" class="btn">Review Project Details</a>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Our team will contact you within 24 hours</li>
              <li>We'll schedule a site visit for accurate assessment</li>
              <li>Final details will be provided after site evaluation</li>
              <li>Project timeline will be confirmed based on your requirements</li>
            </ul>
            
            <p><strong>Contact Information:</strong></p>
            <p>📞 Phone: +91 96157 37373<br>
            📧 Email: gameon.solution.317@gmail.com<br>
            🌐 Website: <a href="https://gameonsolution.in">gameonsolution.in</a></p>
          </div>
          
          <div class="footer">
            <p>This layout is subject to standard site evaluation parameters.</p>
            <p>© 2026 GameOn Solution. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Dear ${data.name},

      Thank you for reaching out to GameOn Solution. Here is your personalized project overview:

      PROJECT DETAILS:
      - Mode: ${modeLabel}
      - Environment: ${envLabel}
      - Grass Type: ${grassLabel}
      - Ground Size: ${data.sizeSqft.toLocaleString("en-IN")} sq.ft
      - Projected Rate Range: ₹${data.rateMin}-₹${data.rateMax} per sq.ft
      - Timeline: ${data.timeline}

      TOTAL SUMMARY: ₹${data.totalEstimate.toLocaleString("en-IN")}

      WHAT IS INCLUDED:
      - Complete turf installation
      - Civil work and base preparation
      - Drainage system installation
      - Fabrication and goal posts
      - Lighting works (200W flood lights)
      - Net covering and electrical wiring
      - Field markings and finishing
      - 2-year warranty on all work

      NEXT STEPS:
      - Our team will contact you within 24 hours
      - We'll schedule a site visit for accurate assessment
      - Final details will be provided after site evaluation

      CONTACT US:
      Phone: +91 96157 37373
      Email: gameon.solution.317@gmail.com
      Website: https://gameonsolution.in

      This layout is subject to standard site evaluation parameters.

      Best regards,
      GameOn Solution Team
    `,
  };
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "turf-calculator-api",
  });
});

// Main email sending endpoint
app.post("/api/send-estimate", upload.single("pdf"), async (req, res) => {
  try {
    // Validate request body
    // const { error, value } = estimateSchema.validate(req.body);
    const { error, value } = estimateSchema.validate(req.body, {
      convert: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.details[0].message,
      });
    }

    const estimateData = value;

    // Create email template
    const emailTemplate = createEmailTemplate(estimateData);

    // Create transporter
    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();

    // Email options
    const mailOptions = {
      from: {
        name: "GameOn Solution",
        address: process.env.SMTP_USER,
      },
      to: estimateData.email,
      replyTo: process.env.REPLY_TO_EMAIL || process.env.SMTP_USER,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments: req.file
        ? [
            {
              filename: `Turf-Cost-Estimate-${estimateData.name.replace(
                /\s+/g,
                "-"
              )}.pdf`,
              content: req.file.buffer,
              contentType: "application/pdf",
            },
          ]
        : [],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      messageId: info.messageId,
      to: estimateData.email,
      name: estimateData.name,
      estimate: estimateData.totalEstimate,
    });

    res.json({
      success: true,
      message: "Estimate sent successfully to your email",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Email sending failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to send email",
      message: "Please try again later or contact support",
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: "Something went wrong. Please try again later.",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service ready`);
  console.log(`🔒 Security features enabled`);
});

module.exports = app;
