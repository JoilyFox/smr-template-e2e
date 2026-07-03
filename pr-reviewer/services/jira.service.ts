import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class JiraService {
  async getTicketDetails(ticketId: string, baseUrl: string, email: string, token: string): Promise<string> {
    try {
      // Jira Cloud REST API requires HTTP Basic auth with the account email as the
      // username and an API token as the password.
      const basicAuth = Buffer.from(`${email}:${token}`).toString('base64');
      const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${ticketId}`, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json',
        },
      });
      
      const fields = response.data.fields || {};
      
      // Parse description which can be Jira Document Format or plain text
      let desc = '';
      if (fields.description) {
        if (typeof fields.description === 'string') {
          desc = fields.description;
        } else if (fields.description.type === 'doc' && Array.isArray(fields.description.content)) {
          // Simplistic parsing of ADF document nodes
          desc = fields.description.content
            .map((node: any) => node.content?.map((c: any) => c.text).join('') || '')
            .join('\n');
        } else {
          desc = JSON.stringify(fields.description);
        }
      }

      return `
========================================
JIRA TICKET: ${ticketId}
========================================
Summary: ${fields.summary || 'No summary'}
Status: ${fields.status?.name || 'Unknown'}
Description:
${desc || 'No description'}
========================================
      `;
    } catch (err: any) {
      console.warn(`[PR Reviewer Warning] Failed to fetch Jira ticket ${ticketId}: ${err.message}`);
      return `[Warning: Could not fetch details for ticket ${ticketId}]`;
    }
  }
}
