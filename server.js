const express = require("express");
const app = express();
const port = 8080;

app.use(express.json());

// --- Sample recipe registry (use the one you provided earlier) ---
const recipeRegistry = [
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.1.0",
    "from": ["1.0.0", "1.0.1", "1.0.2"],
    "to": "1.1.0",
    "manualChanges": { "version": "1.1", "layers": ["base", "connect"] }
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.2.0",
    "from": ["1.1.0", "1.1.1", "1.1.2"],
    "to": "1.2.0",
    "manualChanges": { "version": "1.2", "layers": ["roles", "data"] }
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.3.0",
    "from": ["1.2.0", "1.2.1", "1.2.2"],
    "to": "1.3.2",
    "manualChanges": {}
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.4.0",
    "from": ["1.3.0", "1.3.1", "1.3.2"],
    "to": "1.4.0",
    "manualChanges": { "version": "1.4", "layers": ["purge", "integration"] }
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.5.0",
    "from": ["1.4.0", "1.4.1", "1.3.2"],
    "to": "1.5.0",
    "manualChanges": { "version": "1.5", "layers": ["route53"] }
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.6.0",
    "from": ["1.5.0", "1.5.1", "1.5.2"],
    "to": "1.6.0",
    "manualChanges": {}
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.7.0",
    "from": ["1.6.0", "1.6.1", "1.5.2"],
    "to": "1.7.0",
    "manualChanges": { "version": "1.7", "layers": ["base", "integration", "ecs"] }
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-1.8.0",
    "from": ["1.7.0", "1.7.1", "1.7.2"],
    "to": "1.8.0",
    "manualChanges": { "version": "1.8", "layers": ["purge", "roles"] }
  },
  {
    "type": "manual",
    "from": ["1.8.0"],
    "to": "1.9.0",
    "manualChanges": { "layers": ["all"] }
  },
  {
    "type": "recipe",
    "recipe": "ecs-fargate-blueprint-2.0.0",
    "from": ["1.9.0"],
    "to": "2.0.0",
    "manualChanges": { "version": "2.0", "layers": ["connect", "data", "route53", "ecs"] }
  }
];

const bucketRegistry = [
  {
    id: "bucket-1",
    fromVersion: "1.0.x",
    toVersion: "1.3.x",
  },
  {
    id: "bucket-2",
    fromVersion: "1.3.x",
    toVersion: "1.6.x",
  },
  {
    id: "bucket-3",
    fromVersion: "1.6.x",
    toVersion: "1.8.x",
  },
  {
    id: "bucket-4",
    fromVersion: "1.8.x",
    toVersion: "2.0.x",
  },
];


// --- Helper Functions ---
// function generateMigrationGuide(from, to) {
//   return `${from.split('.').slice(0,2).join('.')}.x-${to.split('.').slice(0,2).join('.')}.x-migration-guide`;
// }

// function getHighestApplicableRecipe(layer, recipes) {
//   return recipes
//     .filter(r => r.from.includes(layer.version))
//     .sort((a,b) => a.to.localeCompare(b.to))
//     .pop(); // pick highest 'to' version
// }

// function runWaves(layersInput, recipes, maxVersion = "2.0.0") {
//   const layers = layersInput.map(l => ({ ...l })); // clone layers
//   let waves = [];
//   let waveNumber = 1;
//   let layersToUpgrade = ["base"];

//   while(layers.some(l => l.version !== maxVersion)) {
//     const waveLayers = [];
//     let toVersion = null;
//     const descriptionLayers = [];

//     layersToUpgrade.forEach(layerName => {
//       const layer = layers.find(l => l.name === layerName);
//       const recipe = getHighestApplicableRecipe(layer, recipes);
//       if (!recipe) return;

//       const requiresManual = recipe.manualChanges.layers?.includes(layer.name) || false;
//       const migrationGuide = requiresManual ? generateMigrationGuide(layer.version, recipe.to) : undefined;

//       waveLayers.push({
//         name: layer.name,
//         currentVersion: layer.version,
//         nextVersion: recipe.to,
//         recipe: recipe.recipe,
//         requiresManual,
//         ...(requiresManual ? { migrationGuide } : {})
//       });

//       layer.version = recipe.to;
//       toVersion = recipe.to;
//       descriptionLayers.push(layer.name);

//       // Add new layers if manualChanges adds layers
//       if (recipe.manualChanges.layers) {
//         recipe.manualChanges.layers.forEach(l => {
//           if (!layersToUpgrade.includes(l)) layersToUpgrade.push(l);
//         });
//       }
//     });

//     if (waveLayers.length === 0) break; // No applicable recipes

//     waves.push({
//       waveNumber,
//       description: `Upgrading layers: ${descriptionLayers.join(', ')}`,
//       nextVersion: waveLayers[0].currentVersion,
//       toVersion: toVersion,
//       layers: waveLayers
//     });

//     waveNumber++;
//   }

//   return waves;
// }

const { generateWaves } = require("./algo");

// --- API Endpoint ---
app.post("/generate-waves", (req, res) => {
  // const { layers: inputLayers } = req.body;
  const inputLayers = req.body;

  if (!inputLayers) {
    return res.status(400).json({ error: "Please provide layers in request body." });
  }

  const targetVersion = recipeRegistry[recipeRegistry.length - 1].to;
  const waves = generateWaves(inputLayers, recipeRegistry, bucketRegistry, targetVersion);
  res.json({ waves });
});

// --- Start server ---
app.listen(port, () => {
  console.log(`Upgrade Wave Server running at http://localhost:${port}`);
});
