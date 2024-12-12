CREATE OR REPLACE VIEW ngc."ComputedResultsView" AS
SELECT id,
    date,
    "progression",
    "computedResults",
    "createdAt",
    "updatedAt",
    "computedResults"->'eau'->>'bilan' as bilanEau,
    "computedResults"->'carbone'->>'bilan' as bilanCarbone
FROM ngc."Simulation"