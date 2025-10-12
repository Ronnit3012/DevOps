const semver = require('semver');

// --- Helpers ---
function getLayerSuffix(layerName) {
  return layerName.split('-').pop();
}

function shortVersion(version) {
  return `${version.split('.').slice(0, 2).join('.')}.x`;
}

function findBucketForVersion(version, buckets) {
  return buckets.find(b => {
    const from = b.fromVersion.replace('.x', '.0');
    const to = b.toVersion.replace('.x', '.999');
    return semver.gte(version, from) && semver.lte(version, to);
  });
}

function getPriorManualRecipe(layerSuffix, currentMinor, sortedRecipes) {
  const priorRecipes = sortedRecipes.filter(pr => {
    const prToMinor = pr.to.split('.').slice(0, 2).join('.');
    return prToMinor === currentMinor;
  });

  return priorRecipes.find(pr => {
    const layersList = pr.manualChanges && Array.isArray(pr.manualChanges.layers)
      ? pr.manualChanges.layers
      : ['all'];
    return pr.type === 'manual' || layersList.includes(layerSuffix) || layersList.includes('all');
  });
}

function buildLayerObject(layer, recipe, currentRecipeHasManual, waveNumber, sortedRecipes) {
  const currentVer = layer.currentVersion || layer.version;
  const layerSuffix = getLayerSuffix(layer.name);

  const fromVerShort = shortVersion(currentVer);
  const toVerShort = shortVersion(recipe.to);

  const layerObj = {
    name: layer.name,
    currentVersion: currentVer,
    nextVersion: recipe.to,
    recipe: recipe.type === 'recipe' ? recipe.recipe : null,
    requiresManual: Boolean(currentRecipeHasManual)
  };

  if (currentRecipeHasManual) {
    layerObj.migrationGuide = `${fromVerShort}-${toVerShort}-migration-guide`;
  }

  // PRECHECK logic
  if (waveNumber === 1 && !currentRecipeHasManual) {
    const currentMinor = currentVer.split('.').slice(0, 2).join('.');
    const priorManual = getPriorManualRecipe(layerSuffix, currentMinor, sortedRecipes);

    if (priorManual) {
      const fromMin = Array.isArray(priorManual.from) && priorManual.from.length ? priorManual.from.sort(semver.compare)[0] : null;
      layerObj.precheck = {
        type: 'manual',
        fromVersion: fromMin ? shortVersion(fromMin) : null,
        toVersion: shortVersion(priorManual.to),
        message: `Please confirm manual changes for ${layer.name} from ${fromMin ?? 'previous'} → ${priorManual.to} have been applied before proceeding.`
      };
    }
  }

  return layerObj;
}

function applyRemainingManualLayers(validLayers, layerVersions, sortedRecipes, effectiveMaxVersion) {
  return validLayers
    .map(layer => {
      const currentVer = layerVersions[layer.name];
      if (effectiveMaxVersion && semver.gte(currentVer, effectiveMaxVersion)) return null;

      const manualRecipe = sortedRecipes.find(r =>
        r.type === 'manual' &&
        Array.isArray(r.from) &&
        r.from.includes(currentVer) &&
        semver.lt(currentVer, r.to)
      );

      if (!manualRecipe) return null;

      return {
        name: layer.name,
        currentVersion: currentVer,
        nextVersion: manualRecipe.to,
        recipe: null,
        requiresManual: true,
        migrationGuide: `${shortVersion(currentVer)}-${shortVersion(manualRecipe.to)}-migration-guide`
      };
    })
    .filter(Boolean);
}

// --- Main function ---
function generateWaves(layers, recipes, buckets, maxVersion) {
  const waves = [];
  let waveNumber = 1;

  const layerVersions = {};
  layers.forEach(l => (layerVersions[l.name] = l.version));

  const sortedRecipes = recipes.slice().sort((a, b) => semver.compare(a.to, b.to));
  const validLayers = layers.filter(l => l.version);

  // Determine active bucket
  const minLayerVersion = validLayers.map(l => l.version).sort(semver.compare)[0];
  const activeBucket = findBucketForVersion(minLayerVersion, buckets);
  const effectiveMaxVersion = activeBucket ? activeBucket.toVersion.replace('.x', '.999') : maxVersion;

  // Process recipes
  for (const recipe of sortedRecipes) {
    const affectedLayers = [];

    validLayers.forEach(layer => {
      const currentVer = layerVersions[layer.name];
      const layerSuffix = getLayerSuffix(layer.name);

      // Skip if recipe exceeds bucket limit
      if (effectiveMaxVersion && semver.gt(recipe.to, effectiveMaxVersion)) return;
      if (!Array.isArray(recipe.from) || !recipe.from.includes(currentVer)) return;
      if (semver.gte(currentVer, recipe.to)) return;

      const currentRecipeHasManual = recipe.type === 'manual' ||
        (recipe.manualChanges && Array.isArray(recipe.manualChanges.layers) &&
         recipe.manualChanges.layers.includes(layerSuffix));

      const layerObj = buildLayerObject({ ...layer, currentVersion: currentVer }, recipe, currentRecipeHasManual, waveNumber, sortedRecipes);
      affectedLayers.push(layerObj);
    });

    if (affectedLayers.length > 0) {
      const minCurrent = affectedLayers.map(l => l.currentVersion).sort(semver.compare)[0];
      waves.push({
        waveNumber: waveNumber++,
        description: `Upgrade from ${minCurrent} to ${recipe.to}${recipe.type === 'manual' ? ' (manual only)' : ''}`,
        nextVersion: minCurrent,
        toVersion: recipe.to,
        layers: affectedLayers
      });

      affectedLayers.forEach(l => (layerVersions[l.name] = l.nextVersion));
    }
  }

  // Handle remaining manual upgrades
  const remainingManual = applyRemainingManualLayers(validLayers, layerVersions, sortedRecipes, effectiveMaxVersion);
  if (remainingManual.length > 0) {
    const minCurrent = remainingManual.map(l => l.currentVersion).sort(semver.compare)[0];
    const maxNext = remainingManual.map(l => l.nextVersion).sort(semver.compare).slice(-1)[0];

    waves.push({
      waveNumber: waveNumber++,
      description: `Upgrade from ${minCurrent} to ${maxNext} (manual only)`,
      nextVersion: minCurrent,
      toVersion: maxNext,
      layers: remainingManual
    });
  }

  return waves;
}

module.exports = { generateWaves };
