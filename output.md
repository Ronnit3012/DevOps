Got it — I’ll translate that **version-wave upgrade orchestration** into a **Node.js CLI** style code.
This will include:

* Wave-based iteration
* Skip logic for layers ahead of the current wave
* Manual step confirmation in CLI
* Migration guide link printing
* Terraform validation step (mocked here, but you can wire in your real commands)
* Cross-layer validation after each wave

---

## **`upgrade-blueprint.js`**

```javascript
#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';

// ---- MOCK MIGRATION SERVICE ----
const migrationService = {
  getNextStep(layer, currentVersion) {
    // This would normally call your service
    const nextVersion = bumpMinor(currentVersion);
    const manualRequired = (layer === 'data' && currentVersion === '1.0.0') ||
                           (layer === 'base' && currentVersion === '1.1.0');
    return {
      toVersion: nextVersion,
      recipeCommand: `rewrite-recipe run ${layer} --from ${currentVersion} --to ${nextVersion}`,
      manualRequired,
      migrationGuideUrl: `https://docs.mycompany.com/migration/${layer}-${currentVersion}-to-${nextVersion}`
    };
  }
};

// ---- INITIAL STATE ----
let currentVersions = {
  base: '1.0.0',
  roles: '1.1.0',
  data: '1.0.0',
  integration: '1.3.0',
  connect: '1.0.0',
  route53: '1.0.0'
};

const targetVersion = '1.4.0';

// ---- UTILITIES ----
function bumpMinor(version) {
  const parts = version.split('.').map(Number);
  parts[1] += 1; // bump minor
  parts[2] = 0; // reset patch
  return parts.join('.');
}

function allReachedTarget(versions, target) {
  return Object.values(versions).every(v => v === target);
}

function minVersion(versions) {
  // Naive version compare - can improve with semver library
  return Object.values(versions).sort(semverCompare)[0];
}

function semverCompare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function runCommand(cmd) {
  console.log(chalk.blue(`→ Executing: ${cmd}`));
  // Here you'd actually spawn child_process to run the command
  return true; // mock success
}

function terraformPlanSuccess(layer) {
  console.log(chalk.gray(`Running terraform plan for ${layer}...`));
  return true; // mock success
}

function fullBlueprintPlanSuccess() {
  console.log(chalk.gray(`Running full blueprint terraform plan...`));
  return true; // mock success
}

async function runWaveUpgrade() {
  let wave = 1;

  console.log(chalk.bold(`📦 Blueprint Upgrade Orchestrator`));
  console.log(`Target version: ${targetVersion}`);
  console.table(currentVersions);

  while (!allReachedTarget(currentVersions, targetVersion)) {
    const lowestVersion = minVersion(currentVersions);

    console.log(chalk.yellow(`\n--- Wave ${wave} ---`));
    console.log(`Upgrading from ${lowestVersion} → next minor version`);

    const layersToUpgrade = Object.entries(currentVersions)
      .filter(([_, ver]) => ver === lowestVersion)
      .map(([layer]) => layer);

    for (const layer of layersToUpgrade) {
      const nextStep = migrationService.getNextStep(layer, currentVersions[layer]);

      console.log(chalk.bold(`\nLayer: ${layer}`));
      console.log(`Current: ${currentVersions[layer]} → Next: ${nextStep.toVersion}`);
      console.log(`Recipe: ${chalk.cyan(nextStep.recipeCommand)}`);

      if (nextStep.manualRequired) {
        console.log(chalk.red(`⚠ Manual changes required!`));
        console.log(`Guide: ${chalk.underline(nextStep.migrationGuideUrl)}`);
        const confirm = await askQuestion("Have you completed the manual steps? (y/n): ");
        if (confirm.trim().toLowerCase() !== 'y') {
          console.log(chalk.gray(`Skipping upgrade for ${layer} until manual steps are done.`));
          continue;
        }
      }

      const success = runCommand(nextStep.recipeCommand);
      if (!success) {
        console.log(chalk.red(`❌ Recipe failed for ${layer}. Stopping.`));
        return;
      }

      if (!terraformPlanSuccess(layer)) {
        console.log(chalk.red(`❌ Validation failed for ${layer}. Stopping.`));
        return;
      }

      currentVersions[layer] = nextStep.toVersion;
    }

    // Cross-layer validation
    if (!fullBlueprintPlanSuccess()) {
      console.log(chalk.red(`❌ Cross-layer validation failed after this wave. Stopping.`));
      return;
    }

    console.table(currentVersions);
    wave++;
  }

  console.log(chalk.green(`\n✅ All layers upgraded successfully to target version ${targetVersion}!`));
}

// ---- RUN SCRIPT ----
runWaveUpgrade();
```

---

## **How It Works**

* Uses **wave-based upgrading**: in each wave, it finds the **lowest version** across all layers and upgrades only those layers to the next minor.
* **Skips ahead** layers until others catch up.
* When a step requires manual changes:

  * Prints a migration guide link.
  * Asks for user confirmation before proceeding.
* Runs mock `terraform plan` after each layer upgrade and **full blueprint validation** after each wave.
* Stops immediately on failure.

---

## **Sample CLI Output**

```
📦 Blueprint Upgrade Orchestrator
Target version: 1.4.0
┌────────────┬─────────┐
│   (index)  │ Values  │
├────────────┼─────────┤
│ base       │ 1.0.0   │
│ roles      │ 1.1.0   │
│ data       │ 1.0.0   │
│ integration│ 1.3.0   │
│ connect    │ 1.0.0   │
│ route53    │ 1.0.0   │
└────────────┴─────────┘

--- Wave 1 ---
Upgrading from 1.0.0 → next minor version

Layer: base
Current: 1.0.0 → Next: 1.1.0
Recipe: rewrite-recipe run base --from 1.0.0 --to 1.1.0
→ Executing: rewrite-recipe run base --from 1.0.0 --to 1.1.0
Running terraform plan for base...
✔ Validation passed

Layer: data
Current: 1.0.0 → Next: 1.1.0
Recipe: rewrite-recipe run data --from 1.0.0 --to 1.1.0
⚠ Manual changes required!
Guide: https://docs.mycompany.com/migration/data-1.0.0-to-1.1.0
Have you completed the manual steps? (y/n):
```

---

If you want, I can also add **checkpoint resume logic** in Node.js, so if the process is stopped midway, it picks up from the last saved state instead of starting over. That’s especially useful for long upgrade runs with many waves.
