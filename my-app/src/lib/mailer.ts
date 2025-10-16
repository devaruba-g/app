import nodemailer from 'nodemailer';

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions) {
    const port = Number(process.env.SMTP_PORT ?? '465');
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.verify();
    } catch (e) {
        console.error('SMTP verify failed:', e);
        throw e;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Chat App" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log('Email queued:', { to, messageId: info?.messageId, accepted: info?.accepted, rejected: info?.rejected });
    } catch (e) {
        console.error('sendMail failed for recipient:', to, e);
        throw e;
    }
}
