import nodemailer from "nodemailer";

// Configure email transport
const emailTransport = process.env.NODE_ENV === "production"
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.example.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    })
  : nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "ethereal.user@ethereal.email",
        pass: "ethereal_pass",
      },
    });

// Email templates
const templates = {
  scanReady: (patientName: string, scanId: number) => ({
    subject: "Your Barogrip Foot Scan is Ready",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Foot Scan is Ready</h2>
        <p>Hello ${patientName},</p>
        <p>Your 3D foot scan (#${scanId}) has been successfully processed and is now available to view in the Barogrip app.</p>
        <p>You can view your scan results, diagnosis, and any recommendations by logging into the app.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.APP_URL || 'https://barogrip.com'}" style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Scan Results
          </a>
        </div>
        <p>Thank you for using Barogrip for your foot health needs.</p>
        <p>Best regards,<br>The Barogrip Team</p>
      </div>
    `,
  }),
  
  newPrescription: (patientName: string, doctorName: string, prescriptionTitle: string) => ({
    subject: "New Prescription from Your Doctor",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Prescription</h2>
        <p>Hello ${patientName},</p>
        <p>Dr. ${doctorName} has created a new prescription for you: <strong>${prescriptionTitle}</strong>.</p>
        <p>You can view the complete details and recommendations by logging into the Barogrip app.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.APP_URL || 'https://barogrip.com'}" style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Prescription
          </a>
        </div>
        <p>Thank you for using Barogrip for your foot health needs.</p>
        <p>Best regards,<br>The Barogrip Team</p>
      </div>
    `,
  }),
  
  passwordReset: (name: string, resetLink: string) => ({
    subject: "Reset Your Barogrip Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your Barogrip account password. If you didn't make this request, you can safely ignore this email.</p>
        <p>To reset your password, click the button below:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Best regards,<br>The Barogrip Team</p>
      </div>
    `,
  }),
};

// Email service functions
export const emailService = {
  async sendScanReadyNotification(
    patientEmail: string,
    patientName: string,
    scanId: number,
    doctorEmail?: string
  ) {
    const { subject, html } = templates.scanReady(patientName, scanId);
    
    try {
      // Send to patient
      await emailTransport.sendMail({
        from: process.env.EMAIL_FROM || "notifications@barogrip.com",
        to: patientEmail,
        subject,
        html,
      });
      
      // Send to doctor if provided
      if (doctorEmail) {
        await emailTransport.sendMail({
          from: process.env.EMAIL_FROM || "notifications@barogrip.com",
          to: doctorEmail,
          subject: `Patient Scan #${scanId} is Ready`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Patient Scan Ready</h2>
              <p>A new patient scan (#${scanId}) for ${patientName} has been processed and is ready for your review.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.DASHBOARD_URL || 'https://dashboard.barogrip.com'}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Review Scan
                </a>
              </div>
            </div>
          `,
        });
      }
      
      return true;
    } catch (error) {
      console.error("Failed to send scan ready notification:", error);
      return false;
    }
  },
  
  async sendNewPrescriptionNotification(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    prescriptionTitle: string
  ) {
    const { subject, html } = templates.newPrescription(
      patientName,
      doctorName,
      prescriptionTitle
    );
    
    try {
      await emailTransport.sendMail({
        from: process.env.EMAIL_FROM || "notifications@barogrip.com",
        to: patientEmail,
        subject,
        html,
      });
      
      return true;
    } catch (error) {
      console.error("Failed to send prescription notification:", error);
      return false;
    }
  },
  
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ) {
    const resetLink = `${process.env.APP_URL || 'https://barogrip.com'}/reset-password?token=${resetToken}`;
    const { subject, html } = templates.passwordReset(name, resetLink);
    
    try {
      await emailTransport.sendMail({
        from: process.env.EMAIL_FROM || "notifications@barogrip.com",
        to: email,
        subject,
        html,
      });
      
      return true;
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return false;
    }
  },
};
