export class EmailService {
  public async sendWelcomeEmail(email: string): Promise<void> {
    console.log(`Sending welcome email to ${email}`)
  }
}
