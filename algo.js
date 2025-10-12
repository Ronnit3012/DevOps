// wavesGenerator.js
function generateWaves(layers, recipes, buckets, maxVersion) {
  const waves = [];
  let waveNumber = 1;

  // Track current version per layer
  const layerVersions = {};
  layers.forEach(l => (layerVersions[l.name] = l.version));

  // Semantic version comparison
  const semverCompare = (a, b) => {
    const aParts = (a || '0.0.0').split('.').map(Number);
    const bParts = (b || '0.0.0').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
    }
    return 0;
  };

  // Sort recipes by 'to' version
  const sortedRecipes = recipes.slice().sort((a, b) => semverCompare(a.to, b.to));

  // Build a quick map: toVersion -> list of recipes
  const recipesByTo = {};
  for (const r of sortedRecipes) {
    if (!recipesByTo[r.to]) recipesByTo[r.to] = [];
    recipesByTo[r.to].push(r);
  }

  // Filter layers with versions
  const validLayers = layers.filter(layer => layer.version);

  // --- Bucket helper ---
  const findBucketForVersion = version =>
    buckets.find(b => {
      const from = b.fromVersion.replace('.x', '.0');
      const to = b.toVersion.replace('.x', '.999');
      return semverCompare(version, from) >= 0 && semverCompare(version, to) <= 0;
    });

  // Determine the bucket to use based on the minimum layer version
  const minLayerVersion = validLayers
    .map(l => l.version)
    .sort((a, b) => semverCompare(a, b))[0];

  const activeBucket = findBucketForVersion(minLayerVersion);

  // If a bucket exists, restrict the maxVersion to bucket.toVersion
  const effectiveMaxVersion = activeBucket ? activeBucket.toVersion.replace('.x', '.999') : maxVersion;

  // Process each recipe
  for (const recipe of sortedRecipes) {
    const affectedLayers = [];

    validLayers.forEach(layer => {
      const currentVer = layerVersions[layer.name];
      const layerSuffix = layer.name.split('-').pop();

      // Restrict recipe to bucket
      if (effectiveMaxVersion && semverCompare(recipe.to, effectiveMaxVersion) > 0) return;

      if (!Array.isArray(recipe.from) || !recipe.from.includes(currentVer)) return;
      if (semverCompare(currentVer, recipe.to) >= 0) return;

      const currentRecipeHasManual =
        recipe.type === 'manual' ||
        (recipe.manualChanges &&
         Array.isArray(recipe.manualChanges.layers) &&
         recipe.manualChanges.layers.some(l => l === layerSuffix));

      const fromVerShort = `${currentVer.split('.').slice(0, 2).join('.')}.x`;
      const toVerShort = `${recipe.to.split('.').slice(0, 2).join('.')}.x`;

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

      // --- PRECHECK logic ---
      if (waveNumber === 1 && !currentRecipeHasManual) {
        const currentMinor = currentVer.split('.').slice(0, 2).join('.');
        const priorRecipes = sortedRecipes.filter(pr => {
          const prToMinor = pr.to.split('.').slice(0, 2).join('.');
          return prToMinor === currentMinor;
        });

        const priorManual = priorRecipes.find(pr => {
          if (pr.type === 'manual') {
            const layersList = pr.manualChanges && Array.isArray(pr.manualChanges.layers)
              ? pr.manualChanges.layers
              : ['all'];
            return layersList.includes(layerSuffix) || layersList.includes('all');
          } else if (pr.manualChanges && Array.isArray(pr.manualChanges.layers) && pr.manualChanges.layers.length > 0) {
            return pr.manualChanges.layers.includes(layerSuffix) || pr.manualChanges.layers.includes('all');
          }
          return false;
        });

        if (priorManual) {
          const fromArr = Array.isArray(priorManual.from) ? priorManual.from.slice().sort((a, b) => semverCompare(a, b)) : [];
          const fromMin = fromArr.length ? fromArr[0] : null;
          const fromBand = fromMin ? `${fromMin.split('.').slice(0, 2).join('.')}.x` : null;
          const toBand = `${priorManual.to.split('.').slice(0, 2).join('.')}.x`;

          layerObj.precheck = {
            type: 'manual',
            fromVersion: fromBand,
            toVersion: toBand,
            message: `Please confirm manual changes for ${layer.name} from ${fromMin ?? 'previous'} → ${priorManual.to} have been applied before proceeding.`
          };
        }
      }

      affectedLayers.push(layerObj);
    });

    if (affectedLayers.length > 0) {
      const minCurrent = affectedLayers.map(l => l.currentVersion).slice().sort((a, b) => semverCompare(a, b))[0];

      waves.push({
        waveNumber: waveNumber++,
        description: `Upgrade from ${minCurrent} to ${recipe.to}${recipe.type === 'manual' ? ' (manual only)' : ''}`,
        nextVersion: minCurrent,
        toVersion: recipe.to,
        layers: affectedLayers
      });

      affectedLayers.forEach(l => {
        layerVersions[l.name] = l.nextVersion;
      });
    }
  }

  // Handle remaining manual upgrades
  const remainingManual = validLayers
    .map(layer => {
      const currentVer = layerVersions[layer.name];
      if (!effectiveMaxVersion || semverCompare(currentVer, effectiveMaxVersion) >= 0) return null;

      const manualRecipe = sortedRecipes.find(r =>
        r.type === 'manual' &&
        Array.isArray(r.from) &&
        r.from.includes(currentVer) &&
        semverCompare(currentVer, r.to) < 0
      );
      if (!manualRecipe) return null;

      const fromVerShort = `${currentVer.split('.').slice(0, 2).join('.')}.x`;
      const toVerShort = `${manualRecipe.to.split('.').slice(0, 2).join('.')}.x`;

      return {
        name: layer.name,
        currentVersion: currentVer,
        nextVersion: manualRecipe.to,
        recipe: null,
        requiresManual: true,
        migrationGuide: `${fromVerShort}-${toVerShort}-migration-guide`
      };
    })
    .filter(Boolean);

  if (remainingManual.length > 0) {
    const minCurrent = remainingManual.map(l => l.currentVersion).sort((a, b) => semverCompare(a, b))[0];
    const maxNext = remainingManual.map(l => l.nextVersion).sort((a, b) => semverCompare(a, b))[remainingManual.length - 1];

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
