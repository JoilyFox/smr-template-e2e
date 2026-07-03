import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { ReviewIssue } from '../interfaces/review-report.interface';

@Injectable()
export class AgentOrchestratorService {
  async runReview(
    diff: string,
    jiraContext: string,
    apiKey: string,
    provider = 'anthropic',
    modelName = 'claude-sonnet-4-5',
  ): Promise<ReviewIssue[]> {
    if (!apiKey) {
      const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
      throw new InternalServerErrorException(`${keyName} is not defined in the environment.`);
    }

    try {
      const systemInstruction = `
        You are an expert AI software architect and senior security engineer performing a code review.
        You compare code changes (git diff) against business requirements (Jira ticket context).
        You must evaluate the diff and return a valid JSON array of issues.
        
        For each issue, you MUST assign a critical score from 1 to 100 representing its severity and risk:
        - 80 to 100: CRITICAL (Security vulnerabilities, deep architectural layering violations, major logic bugs that crash the app)
        - 50 to 79: MEDIUM (Edge cases missing, lack of error handling, performance inefficiencies like N+1 queries, design pattern violations)
        - 20 to 49: LOW (Code simplification suggestions, minor refactoring, poor naming, undocumented logic)
        - 1 to 19: MINOR (Formatting inconsistencies, stylistic opinions, typos)

        Strictly adhere to the JSON schema output. Return ONLY the JSON array without backticks or extra text.
      `;

      const userPrompt = `
        Jira Ticket Context:
        ${jiraContext || 'No ticket context provided.'}

        Pull Request Git Diff:
        ${diff}

        Perform the review and return a valid JSON array matching this format:
        [
          {
            "filePath": "src/modules/example/example.controller.ts",
            "line": 15,
            "category": "security",
            "description": "SQL Injection vulnerability due to raw string interpolation in query builder.",
            "score": 90,
            "justification": "Allows remote code/database command execution by unauthenticated users."
          }
        ]
      `;

      let text = '';

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        text = response.text ?? '';
      } else {
        const anthropic = new Anthropic({ apiKey });
        const message = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4000,
          temperature: 0.1,
          system: systemInstruction,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });
        
        const block = message.content[0];
        if (block.type === 'text') {
          text = block.text;
        } else {
          throw new Error('Unsupported response block type from Anthropic');
        }
      }

      // Parse JSON (strip potential markdown code fences)
      const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonText) as ReviewIssue[];
    } catch (err: any) {
      console.error('[PR Reviewer Error] LLM generation failed:', err.message);
      throw new InternalServerErrorException(`LLM invocation failed: ${err.message}`);
    }
  }
}
