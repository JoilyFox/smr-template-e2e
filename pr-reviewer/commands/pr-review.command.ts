import * as dotenv from 'dotenv';
// Load environment variables from .env file before anything else
dotenv.config();

import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { NestFactory } from '@nestjs/core';
import { PrReviewerModule } from '../pr-reviewer.module';
import { PrReviewerService } from '../pr-reviewer.service';

async function bootstrap() {
  const args = process.argv.slice(2);
  const isHeadless = args.includes('--headless') || args.includes('--ci');
  
  // Extract PR ID from arguments (ignoring flags)
  const prIdArg = args.find(arg => !arg.startsWith('-'));
  
  let prId = prIdArg;
  if (!prId && !isHeadless) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prId',
        message: 'Enter the Pull Request ID / Number:',
        validate: (input) => (input ? true : 'PR ID is required'),
      },
    ]);
    prId = answers.prId;
  }

  if (!prId) {
    console.error(chalk.red('Error: Pull Request ID is required. Pass it as an argument or run in interactive mode.'));
    process.exit(1);
  }

  // Check if the correct API key is configured based on the provider setting
  const configPath = require('path').join(process.cwd(), 'pr-reviewer', 'pr-reviewer.config.json');
  let aiProvider = 'anthropic';
  try {
    const configContent = require('fs').readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    aiProvider = config?.ai?.provider || 'anthropic';
  } catch { /* use default */ }

  const requiredKey = aiProvider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
  if (!process.env[requiredKey]) {
    console.log(chalk.yellow(`\nℹ ${requiredKey} is not defined in the environment.`));
    console.log(chalk.cyan('To run PR reviews locally using your model subscription (no API key required):'));
    console.log(chalk.white('  1. Install Claude Code: ') + chalk.bold('npm install -g @anthropic-ai/claude-code'));
    console.log(chalk.white('  2. Configure your Git/Jira MCP servers in Claude.'));
    console.log(chalk.white('  3. Start Claude Code in this repository: ') + chalk.bold('claude'));
    console.log(chalk.white('  4. Type: ') + chalk.bold('start review') + chalk.white(' or ') + chalk.bold('review PROJ-123\n'));
    console.log(chalk.gray(`If you want to run this standalone command, export ${requiredKey} and run again.\n`));
    process.exit(0);
  }

  const app = await NestFactory.createApplicationContext(PrReviewerModule);
  const reviewerService = app.get(PrReviewerService);

  console.log(chalk.blue(`🚀 Starting AI PR Review for PR #${prId}...`));

  try {
    const report = await reviewerService.generateReport(prId);
    console.log(chalk.green(`\n✓ Analysis complete. Found ${report.issues.length} review suggestions.\n`));

    for (const issue of report.issues) {
      console.log(chalk.bold.yellow(`\n[Score: ${issue.score}/100] Category: ${issue.category.toUpperCase()}`));
      console.log(`File: ${issue.filePath}:${issue.line}`);
      console.log(`Description: ${issue.description}`);
      console.log(`Justification: ${issue.justification}`);

      const minAuto = report.config.rules.minScoreToAutoComment;
      const minPrompt = report.config.rules.minScoreToPrompt;

      if (issue.score >= minAuto) {
        console.log(chalk.red(`▶ Score is critical (${issue.score} >= ${minAuto}). Auto-posting comment...`));
        await reviewerService.postComment(prId, issue);
      } else if (issue.score >= minPrompt) {
        if (isHeadless) {
          console.log(chalk.gray(`▶ Headless mode: skipping interactive prompt for score ${issue.score}.`));
          continue;
        }

        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldPost',
            message: 'Would you like to post this comment to the Pull Request?',
            default: true,
          },
        ]);

        if (answers.shouldPost) {
          console.log(chalk.cyan('Posting comment...'));
          await reviewerService.postComment(prId, issue);
        } else {
          console.log(chalk.gray('Comment skipped.'));
        }
      } else {
        console.log(chalk.gray(`▶ Score is low (${issue.score} < ${minPrompt}). Skipping comment.`));
      }
    }

    console.log(chalk.green('\n🎉 AI PR Review complete!'));
  } catch (err: any) {
    console.error(chalk.red('\n❌ AI PR Review failed:'), err.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
