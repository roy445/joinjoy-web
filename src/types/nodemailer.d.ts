declare module "nodemailer" {
  export interface TransportOptions {
    service?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  }

  export interface SendMailOptions {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }

  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<any>;
  }

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
