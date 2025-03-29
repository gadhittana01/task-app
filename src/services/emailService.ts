import nodemailer from 'nodemailer';
import { configManager } from '../config/config';

class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private constructor() {
    const config = configManager.getConfig();
    
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    
    this.transporter.verify((error, _success) => {
      if (error) {
      }
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const config = configManager.getConfig();
      
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        html,
      };

      // Send the email
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      // Rethrow the error with context
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  
  public async sendEmailToAnyAddress(to: string, subject: string, html: string): Promise<void> {
    await this.sendEmail(to, subject, html);
  }

  public async sendTaskAssignmentEmail(to: string, taskTitle: string, taskId: string, assignedBy: string): Promise<void> {
    const subject = `New Task Assignment: ${taskTitle}`;
    const html = `
      <h1>You've been assigned a new task</h1>
      <p>Hello,</p>
      <p>You've been assigned to the task: <strong>${taskTitle}</strong> by ${assignedBy}.</p>
      <p>Click <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks/${taskId}">here</a> to view the task.</p>
      <p>Thank you,</p>
      <p>Task Management Team</p>
    `;
    
    await this.sendEmail(to, subject, html);
  }

  public async sendTaskUpdateEmail(to: string, taskTitle: string, taskId: string, updatedBy: string): Promise<void> {
    const subject = `Task Updated: ${taskTitle}`;
    const html = `
      <h1>Task Update Notification</h1>
      <p>Hello,</p>
      <p>The task <strong>${taskTitle}</strong> has been updated by ${updatedBy}.</p>
      <p>Click <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks/${taskId}">here</a> to view the task updates.</p>
      <p>Thank you,</p>
      <p>Task Management Team</p>
    `;
    
    await this.sendEmail(to, subject, html);
  }

  public async sendTaskCommentEmail(to: string, taskTitle: string, taskId: string, commentedBy: string, commentContent: string): Promise<void> {
    const subject = `New Comment on Task: ${taskTitle}`;
    const html = `
      <h1>New Comment Notification</h1>
      <p>Hello,</p>
      <p>${commentedBy} commented on the task <strong>${taskTitle}</strong>:</p>
      <blockquote>${commentContent}</blockquote>
      <p>Click <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks/${taskId}">here</a> to view the comment and reply.</p>
      <p>Thank you,</p>
      <p>Task Management Team</p>
    `;
    
    await this.sendEmail(to, subject, html);
  }
  
}

export const emailService = EmailService.getInstance(); 