/**
 * Email Template Service - Generates email content
 * Business Layer - Handles email formatting and templates
 */

export interface TaskAssignedTemplate {
  taskTitle: string;
  assigneeName: string;
  priority: string;
}

export interface TaskStatusChangedTemplate {
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
}

export class EmailTemplateService {
  generateTaskAssignedEmail(data: TaskAssignedTemplate): { subject: string; body: string } {
    return {
      subject: `New Task Assigned: ${data.taskTitle}`,
      body: `
Hello ${data.assigneeName},

A new task has been assigned to you:

Task: ${data.taskTitle}
Priority: ${data.priority}

Please log in to the Task Management System to view the details.

Best regards,
Task Management System
      `.trim()
    };
  }

  generateTaskStatusChangedEmail(data: TaskStatusChangedTemplate): { subject: string; body: string } {
    return {
      subject: `Task Status Updated: ${data.taskTitle}`,
      body: `
Hello,

The status of task "${data.taskTitle}" has been updated:

Previous Status: ${data.oldStatus}
New Status: ${data.newStatus}

Best regards,
Task Management System
      `.trim()
    };
  }

  generateWelcomeEmail(userName: string, userEmail: string): { subject: string; body: string } {
    return {
      subject: 'Welcome to Task Management System',
      body: `
Hello ${userName},

Welcome to the Task Management System!

Your account (${userEmail}) has been successfully created.

You can now:
- Create and manage tasks
- Assign tasks to team members
- Track progress and completion

Best regards,
Task Management System
      `.trim()
    };
  }
}
