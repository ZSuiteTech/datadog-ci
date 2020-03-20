import chalk from 'chalk';

import { ConfigOverride, ExecutionRule, PollResult, Step, Test, TestComposite } from './interfaces';
import { hasResultPassed, hasTestSucceeded } from './utils';

const renderStep = (step: Step) => {
  const icon = step.error
    ? chalk.bold.red('✖')
    : step.skipped
    ? chalk.bold.yellow('⇢')
    : chalk.bold.green('✓');
  const value = step.value ? `\n      ${chalk.dim(step.value)}` : '';
  const error = step.error ? `\n      ${chalk.red.dim(step.error)}` : '';
  const colorDuration: (arg: any) => string =
    step.duration > 10000
      ? chalk.bold.red
      : step.duration > 5000
      ? chalk.bold.yellow
      : chalk.bold;
  const duration = `${colorDuration(step.duration)}ms`;

  return `    ${icon} | ${duration} - ${step.description}${value}${error}`;
};

export const renderSteps = (test: TestComposite, baseUrl: string) =>
  test.results.map((r: PollResult) => {
    const resultUrl = r.result.unhealthy
      ? r.result.errorMessage || 'General Error'
      : `${baseUrl}/synthetics/details/${test.public_id}/result/${r.resultID}`;
    const success = hasResultPassed(r);
    const color = success ? chalk.green : chalk.red;
    const icon = success ? chalk.bold.green('✓') : chalk.bold.red('✖');
    const device = test.type === 'browser' && r.result.device ? ` - device: ${chalk.bold(r.result.device.id)}` : '';
    const resultIdentification = color(`  ${icon} location: ${chalk.bold(r.dc_id.toString())}${device}`);
    let steps = '';

    if (r.result.error) {
      steps = `\n    ${chalk.red.bold(`✖ | ${r.result.error}`)}`;
    } else if (test.type === 'api') {
      const req = test.config.request;
      const requestText = `${chalk.bold(req.method)} - ${req.url}`;
      const errors = success
        ? ''
        : color(`\n      [${chalk.bold(r.result.errorCode!)}] - ${chalk.dim(r.result.errorMessage!)}`);

      steps = `\n    ${icon} ${color(requestText)}${errors}`;
    } else if (test.type === 'browser' && !hasResultPassed(r) && r.result.stepDetails) {
      // We render the step only if the test hasn't passed to avoid cluttering the output.
      steps = `\n${r.result.stepDetails.map(renderStep).join('\n')}`;
    }

    return `${resultIdentification}\n    ⎋  ${chalk.dim.cyan(resultUrl)}${steps}`;
  }).join('\n').concat('\n');

export const renderResult = (test: TestComposite, baseUrl: string) => {
  const success = hasTestSucceeded(test);
  const isNonBlocking = test.options.execution_rule === ExecutionRule.NON_BLOCKING;
  const icon = success ? chalk.bold.green('✓') : isNonBlocking ? chalk.bold.yellow('⚠') : chalk.bold.red('✖');
  const idDisplay = `[${chalk.bold.dim(test.public_id)}]`;
  const nameColor = success ? chalk.bold.green : chalk.bold.red;
  const nonBlockingText = !success && isNonBlocking ? 'This tests is set to be non-blocking in Datadog' : '';

  let consoleOutput = `${icon} ${idDisplay} | ${nameColor(test.name)} ${nonBlockingText}\n`;

  if (!success) {
    consoleOutput += renderSteps(test, baseUrl);
  }

  return consoleOutput;
};

export const renderTrigger = (test: Test | undefined, testId: string, config: ConfigOverride) => {
  const idDisplay = `[${chalk.bold.dim(testId)}]`;
  let message;

  if (!test) {
    message = chalk.red.bold(`Could not find test "${testId}"`);
  } else if (config.skip) {
    message = `>> Skipped test "${chalk.yellow.dim(test.name)}"`;
  } else if (test.options?.execution_rule === ExecutionRule.SKIPPED) {
    message = `>> Skipped test "${chalk.yellow.dim(test.name)}" because of execution rule configuration in Datadog`;
  } else {
    message = `Trigger test "${chalk.green.bold(test.name)}"`;
  }

  return `${idDisplay} ${message}\n`;
};

export const renderHeader = (tests: TestComposite[], timings: { startTime: number }) => {
  const currentTime = Date.now();

  return `\n\n${chalk.bold.cyan('=== REPORT ===')}
Took ${chalk.bold((currentTime - timings.startTime).toString())}ms\n\n`;
};

export const renderWait = (test: Test) => {
  const idDisplay = `[${chalk.bold.dim(test.public_id)}]`;

  return `${idDisplay} Waiting results for "${chalk.green.bold(test.name)}"\n`;
};