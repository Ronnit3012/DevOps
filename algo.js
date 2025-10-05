// wavesGenerator.js
function generateWaves(layers, recipes, maxVersion) {
  const waves = [];
  let waveNumber = 1;

  // Track current version per layer
  const layerVersions = {};
  layers.forEach(l => layerVersions[l.name] = l.version);

  // Sort recipes by semantic version 'to' field
  const semverCompare = (a, b) =>
    a.to.split('.').map(Number).reduce((acc, num, i) => acc || num - b.to.split('.')[i], 0);

  const sortedRecipes = recipes.sort((a, b) => semverCompare(a, b));

  // Filter valid layers (have version and/or < maxVersion)
  const validLayers = layers.filter(layer => layer.version);

  // Process recipe-based waves (including manual recipes)
  for (const recipe of sortedRecipes) {
    const affectedLayers = [];

    validLayers.forEach(layer => {
      const currentVer = layerVersions[layer.name];

      if ((recipe.from && recipe.from.includes(currentVer)) || recipe.type === 'manual') {
        const requiresManual = recipe.type === 'manual' || recipe.manualChanges?.layers?.includes(layer.name) || false;

        const layerObj = {
          name: layer.name,
          currentVersion: currentVer,
          nextVersion: recipe.to,
          recipe: recipe.type === 'recipe' ? recipe.recipe : null,
          requiresManual
        };

        if (requiresManual) {
          layerObj.migrationGuide = `${currentVer.split('.').slice(0,2).join('.')}x-${recipe.to.split('.').slice(0,2).join('.')}x-migration-guide`;
        }

        affectedLayers.push(layerObj);
      }
    });

    if (affectedLayers.length > 0) {
      const minCurrent = affectedLayers.map(l => l.currentVersion).sort()[0];

      waves.push({
        waveNumber: waveNumber++,
        description: `Upgrade from ${minCurrent} to ${recipe.to}${recipe.type === 'manual' ? ' (manual only)' : ''}`,
        nextVersion: minCurrent,
        toVersion: recipe.to,
        layers: affectedLayers
      });

      affectedLayers.forEach(l => layerVersions[l.name] = l.nextVersion);
    }
  }

  // Any remaining layers that haven't reached maxVersion can still get a final manual wave
  const remainingManual = validLayers
    .filter(layer => layerVersions[layer.name] < maxVersion)
    .map(layer => {
      const currentVer = layerVersions[layer.name];
      return {
        name: layer.name,
        currentVersion: currentVer,
        nextVersion: maxVersion,
        recipe: null,
        requiresManual: true,
        migrationGuide: `${currentVer.split('.').slice(0,2).join('.')}x-${maxVersion.split('.').slice(0,2).join('.')}x-migration-guide`
      };
    });

  if (remainingManual.length > 0) {
    const minCurrent = remainingManual.map(l => l.currentVersion).sort()[0];
    const maxNext = remainingManual.map(l => l.nextVersion).sort()[remainingManual.length - 1];

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

// Export the function
module.exports = { generateWaves };
